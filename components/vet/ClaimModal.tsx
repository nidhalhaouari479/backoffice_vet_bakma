"use client";

import { useState } from "react";
import { CalendarClock, Hand } from "lucide-react";
import { getSupabase, errorMessage } from "@/lib/supabase";
import { formatDateTime } from "@/lib/labels";
import type { Consultation } from "@/lib/types";
import { Alert, Button, Field, Input, Modal, cn, useToast } from "../ui";

/**
 * Modal « Prendre en charge » → rpc claim_consultation.
 * Le vétérinaire accepte en choisissant une des 3 dates proposées par le propriétaire
 * (RDV libre et optionnel pour les anciennes demandes sans dates proposées).
 */
export function ClaimModal({ consultation, onClose, onDone }: { consultation: Consultation | null; onClose: () => void; onDone: (c: Consultation) => void }) {
  const [when, setWhen] = useState("");
  const [slot, setSlot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const slots = consultation?.proposed_slots ?? [];
  const withSlots = slots.length > 0;

  async function claim() {
    if (!consultation) return;
    if (withSlots && !slot) {
      setError("Choisissez une des dates proposées par le propriétaire.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await getSupabase().rpc("claim_consultation", {
      p_consultation_id: consultation.id,
      p_scheduled_at: withSlots ? slot : when ? new Date(when).toISOString() : null,
    });
    setBusy(false);
    if (error) {
      setError(errorMessage(error));
      return;
    }
    toast("Consultation acceptée");
    setWhen("");
    setSlot(null);
    onDone(consultation);
  }

  return (
    <Modal
      open={!!consultation}
      onClose={onClose}
      title="Accepter la demande"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={claim} loading={busy} disabled={withSlots && !slot} icon={<Hand className="size-4" />}>
            Accepter
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-body">
          Vous allez prendre en charge la vérification de <strong className="text-navy">{consultation?.animal?.name ?? "cet animal"}</strong>. Le propriétaire sera
          notifié et vous pourrez accéder à ses coordonnées.
        </p>
        {withSlots ? (
          <div>
            <p className="mb-2 text-sm font-semibold text-navy">Choisissez la date du rendez-vous *</p>
            <p className="mb-3 text-xs text-muted">Le propriétaire a proposé ces 3 créneaux.</p>
            <div className="space-y-2">
              {slots.map((s) => (
                <label
                  key={s}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition",
                    slot === s ? "border-primary bg-primary-soft/60 text-primary" : "border-line text-navy hover:border-primary/50",
                  )}
                >
                  <input type="radio" name="slot" className="size-4 accent-[var(--color-primary)]" checked={slot === s} onChange={() => setSlot(s)} />
                  <CalendarClock className="size-4" />
                  {formatDateTime(s)}
                </label>
              ))}
            </div>
          </div>
        ) : (
          <Field label="Rendez-vous (optionnel)" hint="Vous pourrez planifier ou modifier le rendez-vous plus tard.">
            <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} icon={<CalendarClock />} />
          </Field>
        )}
        <Alert>{error}</Alert>
      </div>
    </Modal>
  );
}
