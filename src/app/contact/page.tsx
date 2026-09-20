"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export default function ContactPage() {
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  // Honeypot — visually hidden from a real visitor via sr-only, but present
  // in the DOM for a bot filling every field blindly to fill in. Same
  // pattern as the "website" field generated sites' own forms use.
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message, website }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.show("error", data?.message ?? "Couldn't send that — try again.");
        return;
      }
      setSent(true);
    } catch {
      toast.show("error", "Network error — try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <Link href="/">
        <Logo />
      </Link>

      <h1 className="mt-8 font-display text-3xl font-bold">Contact us</h1>
      <p className="mt-1 text-sm text-ink/50">
        Question, bug report, or something else — we read every message. For product questions, also
        check the <Link href="/help" className="text-signal hover:underline">Help Center</Link>.
      </p>

      {sent ? (
        <div className="glass-panel mt-8 rounded-2xl p-6 text-center">
          <p className="font-display font-bold">Thanks — we&apos;ve got it.</p>
          <p className="mt-1 text-sm text-ink/50">We&apos;ll get back to you at {email}.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="glass-panel mt-8 space-y-4 rounded-2xl p-6">
          <div>
            <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium">Name</label>
            <input
              id="contact-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="focus-ring w-full rounded-lg border border-ink/15 px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium">Email</label>
            <input
              id="contact-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="focus-ring w-full rounded-lg border border-ink/15 px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium">Message</label>
            <textarea
              id="contact-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              minLength={10}
              rows={5}
              className="focus-ring w-full rounded-lg border border-ink/15 px-4 py-2.5 text-sm"
            />
          </div>
          {/* Honeypot: real visitors never see or fill this. */}
          <div className="sr-only" aria-hidden="true">
            <label htmlFor="contact-website">Website</label>
            <input
              id="contact-website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Sending…" : "Send message"}
          </Button>
        </form>
      )}
    </main>
  );
}
