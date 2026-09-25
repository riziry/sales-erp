"use client";
import {
  Children,
  isValidElement,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Check,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  PackageSearch,
} from "lucide-react";
import Modal from "./modal";

export type Choice = {
  id: string;
  label: string;
  description?: string;
  category?: string;
  detail?: string;
  keywords?: string;
};
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function Picker({
  label,
  options,
  value = "",
  placeholder = "Search and select…",
  onChange,
  onMany,
  limit = 200,
}: {
  label: string;
  options: Choice[];
  value?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  onMany?: (values: string[]) => void;
  limit?: number;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.id === value);
  return (
    <div className="field picker-field">
      <span>{label}</span>
      <button
        type="button"
        className="picker-trigger"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Search size={16} />
        <span>{selected?.label || placeholder}</span>
        <ChevronDown size={15} />
      </button>
      {open && (
        <PickerDialog
          label={label}
          options={options}
          value={value}
          multiple={!!onMany}
          limit={limit}
          onClose={() => setOpen(false)}
          onSelect={(ids) => {
            if (onMany) onMany(ids);
            else onChange?.(ids[0]);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
function PickerDialog({
  label,
  options,
  value,
  multiple,
  limit,
  onClose,
  onSelect,
}: {
  label: string;
  options: Choice[];
  value: string;
  multiple: boolean;
  limit: number;
  onClose: () => void;
  onSelect: (values: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(0);
  const [active, setActive] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const id = useId();
  const categories = useMemo(
    () =>
      [...new Set(options.map((o) => o.category).filter(Boolean))] as string[],
    [options],
  );
  const filtered = useMemo(() => {
    const words = normalize(query).trim().split(/\s+/);
    return options.filter(
      (o) =>
        (!category || o.category === category) &&
        words.every((word) =>
          normalize(
            `${o.label} ${o.description || ""} ${o.keywords || ""} ${o.category || ""}`,
          ).includes(word),
        ),
    );
  }, [options, query, category]);
  const pages = Math.max(1, Math.ceil(filtered.length / 20));
  const visible = filtered.slice(page * 20, (page + 1) * 20);
  function choose(option: Choice) {
    if (!multiple) return onSelect([option.id]);
    setSelected((values) =>
      values.includes(option.id)
        ? values.filter((v) => v !== option.id)
        : values.length < limit
          ? [...values, option.id]
          : values,
    );
  }
  function focusResult(index: number) {
    setActive(index);
    document
      .getElementById(`${id}-${index}`)
      ?.scrollIntoView({ block: "nearest" });
  }
  return (
    <Modal title={label} onClose={onClose} className="picker-modal">
      <p className="muted picker-help">
        {multiple
          ? "Search, select several items, then add them together."
          : "Type a name, SKU, or keyword to find a match."}
      </p>
      <div className="picker-search">
        <Search size={20} />
        <input
          id={`${id}-search`}
          data-initial-focus
          aria-label={`Search ${label.toLowerCase()}`}
          placeholder="Start typing to search…"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded="true"
          aria-controls={`${id}-results`}
          aria-activedescendant={
            visible[active] ? `${id}-${active}` : undefined
          }
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              focusResult(
                Math.max(
                  0,
                  Math.min(
                    visible.length - 1,
                    active + (e.key === "ArrowDown" ? 1 : -1),
                  ),
                ),
              );
            }
            if (e.key === "Enter") {
              e.preventDefault();
              if (visible[active]) choose(visible[active]);
            }
          }}
        />
      </div>
      {categories.length > 0 && categories.length <= 12 && (
        <div className="filter-chips" aria-label="Categories">
          {["", ...categories.sort()].map((c) => (
            <button
              type="button"
              key={c}
              aria-pressed={category === c}
              onClick={() => {
                setCategory(c);
                setPage(0);
                setActive(0);
              }}
            >
              {c || "All categories"}
            </button>
          ))}
        </div>
      )}
      <div className="picker-meta">
        <span role="status">
          {filtered.length} results{query && ` for “${query}”`}
        </span>
        <span className="keyboard-hint">↑ ↓ to browse · Enter to select</span>
      </div>
      <div
        className="picker-results"
        id={`${id}-results`}
        role="listbox"
        aria-label={label}
        aria-multiselectable={multiple || undefined}
      >
        {visible.map((option, index) => (
          <button
            type="button"
            role="option"
            tabIndex={-1}
            aria-selected={
              multiple ? selected.includes(option.id) : value === option.id
            }
            id={`${id}-${index}`}
            key={option.id}
            className={`picker-option ${active === index ? "highlighted" : ""}`}
            onFocus={() => setActive(index)}
            onClick={() => {
              choose(option);
              if (multiple)
                document
                  .getElementById(`${id}-search`)
                  ?.focus({ preventScroll: true });
            }}
          >
            {multiple && (
              <span className="picker-checkbox">
                {selected.includes(option.id) && <Check size={15} />}
              </span>
            )}
            <span className="picker-option-copy">
              <strong>{option.label}</strong>
              {option.description && <small>{option.description}</small>}
            </span>
            {option.detail && (
              <span className="picker-detail">{option.detail}</span>
            )}
            {!multiple && value === option.id && <Check size={18} />}
          </button>
        ))}
      </div>
      {!visible.length && (
        <div className="empty-state compact">
          <PackageSearch size={32} />
          <h3>No matches found</h3>
          <p>Try a shorter name, a SKU, or another keyword.</p>
          <button
            type="button"
            className="button small"
            onClick={() => {
              setQuery("");
              setCategory("");
              setPage(0);
            }}
          >
            Clear search
          </button>
        </div>
      )}
      <div className="picker-footer">
        <div className="pagination-controls">
          <button
            type="button"
            className="icon-button"
            aria-label="Previous results"
            disabled={!page}
            onClick={() => {
              setPage(page - 1);
              setActive(0);
            }}
          >
            <ChevronLeft size={18} />
          </button>
          <span>
            Page {page + 1} of {pages}
          </span>
          <button
            type="button"
            className="icon-button"
            aria-label="Next results"
            disabled={page + 1 >= pages}
            onClick={() => {
              setPage(page + 1);
              setActive(0);
            }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
        {multiple && (
          <button
            type="button"
            className="button primary"
            disabled={!selected.length}
            onClick={() => onSelect(selected)}
          >
            Add {selected.length || "selected"}{" "}
            {selected.length === 1 ? "item" : "items"}
          </button>
        )}
      </div>
      {multiple && selected.length >= limit && (
        <p className="muted small-text">
          Selection limit reached ({limit}). Add these items before continuing.
        </p>
      )}
    </Modal>
  );
}
// Compatible with existing form controls while replacing long native menus.
export function SearchSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  const options: Choice[] = [];
  function visit(nodes: ReactNode) {
    Children.forEach(nodes, (child) => {
      if (!isValidElement<{ value?: string; children?: ReactNode }>(child))
        return;
      if (child.type === "option")
        options.push({
          id: String(child.props.value ?? child.props.children ?? ""),
          label: textContent(child.props.children),
        });
      else visit(child.props.children);
    });
  }
  visit(children);
  return (
    <Picker label={label} value={value} options={options} onChange={onChange} />
  );
}
function textContent(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) =>
      isValidElement<{ children?: ReactNode }>(child)
        ? textContent(child.props.children)
        : String(child),
    )
    .join("");
}
