import { useState, useEffect, useCallback } from 'react';

export type ContactsMap = Record<string, string>;

export function useContacts() {
  const [contacts, setContacts] = useState<ContactsMap>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem('contacts');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.contacts) {
          setContacts(parsed.contacts);
        }
      }
    } catch (e) {
      console.error('Failed to load contacts', e);
    }
  }, []);

  const saveContacts = useCallback((newContacts: ContactsMap) => {
    setContacts(newContacts);
    localStorage.setItem('contacts', JSON.stringify({ contacts: newContacts }));
  }, []);

  const addContact = useCallback((name: string, address: string) => {
    setContacts((prev) => {
      const next = { ...prev, [name.toLowerCase()]: address };
      localStorage.setItem('contacts', JSON.stringify({ contacts: next }));
      return next;
    });
  }, []);

  const removeContact = useCallback((name: string) => {
    setContacts((prev) => {
      const next = { ...prev };
      delete next[name.toLowerCase()];
      localStorage.setItem('contacts', JSON.stringify({ contacts: next }));
      return next;
    });
  }, []);

  const getContact = useCallback((name: string) => {
    return contacts[name.toLowerCase()] || null;
  }, [contacts]);

  return { contacts, addContact, removeContact, getContact, saveContacts };
}
