import type { Customer, CustomerContact, CustomerSnapshot } from "./model";

export function contactRecipient(contact: CustomerContact) {
  return { name: contact.name, role: contact.role, phone: contact.phone, email: contact.email };
}
export function customerSnapshot(customer: Customer, contactId?: string): CustomerSnapshot {
  const contact = customer.kind !== "INDIVIDUAL"
    ? (customer.contacts || []).find(c => c.active && c.id === (contactId || customer.primaryContactId))
    : undefined;
  return {
    name: customer.name, contact: customer.contact, email: customer.email,
    address: customer.address, active: customer.active, notes: "",
    kind: customer.kind,
    recipientId: contact?.id ?? null,
    recipient: contact ? contactRecipient(contact) : null,
  };
}
export function customerSearchText(customer: Customer) {
  return [customer.name, customer.contact, customer.email, customer.address,
    ...(customer.contacts || []).flatMap(c => [c.name, c.role, c.phone, c.email])].join(" ");
}
