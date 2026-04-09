"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProviderSectionHeader from "@/components/provider/ProviderSectionHeader";
import { useAuth } from "@/context/AuthContext";
import { getWorkerProfile, updateWorkerProfile } from "@/services/firebase/workerAuth";

export default function ProviderBankDetailsPage() {
  const { firebaseUser } = useAuth();
  const [accountName, setAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [upiId, setUpiId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!firebaseUser?.uid) return;
    void (async () => {
      const profile = await getWorkerProfile(firebaseUser.uid);
      if (!profile?.bankDetails) return;
      setAccountName(profile.bankDetails.accountName ?? "");
      setBankName(profile.bankDetails.bankName ?? "");
      setAccountNumber(profile.bankDetails.accountNumber ?? "");
      setIfscCode(profile.bankDetails.ifscCode ?? "");
      setUpiId(profile.bankDetails.upiId ?? "");
    })();
  }, [firebaseUser?.uid]);

  function validate(): string {
    if (!accountName.trim()) return "Account name is required.";
    if (!bankName.trim()) return "Bank name is required.";
    if (!/^\d{9,18}$/.test(accountNumber.trim())) return "Account number must be 9-18 digits.";
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.trim().toUpperCase())) return "Invalid IFSC code.";
    if (upiId.trim() && !/^[\w.-]{2,}@[\w.-]{2,}$/.test(upiId.trim())) return "Invalid UPI ID.";
    return "";
  }

  return (
    <div className="space-y-6">
      <ProviderSectionHeader
        eyebrow="Finance"
        title="Bank Details"
        subtitle="Update withdrawal destination for bank and UPI payouts."
      />

      <section className="space-y-3 rounded-xl border border-border bg-card p-5">
        <Input placeholder="Account Holder Name" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
        <Input placeholder="Bank Name" value={bankName} onChange={(e) => setBankName(e.target.value)} />
        <Input placeholder="Account Number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
        <Input
          placeholder="IFSC Code"
          value={ifscCode}
          onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
        />
        <Input placeholder="UPI ID (optional)" value={upiId} onChange={(e) => setUpiId(e.target.value)} />

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <Button
          className="h-11"
          disabled={saving || !firebaseUser?.uid}
          onClick={() => {
            const validationError = validate();
            setError(validationError);
            if (validationError || !firebaseUser?.uid) return;

            setSaving(true);
            void updateWorkerProfile(firebaseUser.uid, {
              bankDetails: {
                accountName: accountName.trim(),
                bankName: bankName.trim(),
                accountNumber: accountNumber.trim(),
                ifscCode: ifscCode.trim().toUpperCase(),
                upiId: upiId.trim() || undefined,
              },
            })
              .then(() => setError(""))
              .finally(() => setSaving(false));
          }}
        >
          {saving ? "Saving..." : "Save Bank Details"}
        </Button>
      </section>
    </div>
  );
}
