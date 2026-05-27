/**
 * Gemeinsame Email-Typen für alle Provider (Brevo, Resend, …).
 *
 * Wenn du einen neuen Provider hinzufügst, muss sein `send`-Function
 * `SendEmailOptions` akzeptieren und nichts zurückgeben (oder werfen
 * bei Fehlern).
 */

export interface EmailEmpfaenger {
  email: string;
  name?: string;
}

export interface SendEmailOptions {
  to:           EmailEmpfaenger[];
  subject:      string;
  htmlContent:  string;
  textContent?: string;
  replyTo?:     EmailEmpfaenger;
  tags?:        string[];
}
