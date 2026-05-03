import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_KEY || 're_build_placeholder');
