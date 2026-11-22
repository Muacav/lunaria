// Builds Lunaria's account emails (Supabase Auth templates) in English,
// French and Italian. Each email picks its language from the user's
// metadata (`lang`, saved at sign-up and when she changes language), with
// English as the fallback. Images are served by the app itself
// ({{ .SiteURL }}/email/...).
//
//   node scripts/email-templates.mjs            → writes supabase/email/*.html
//   node scripts/email-templates.mjs --json     → prints the auth config patch

import { writeFileSync, mkdirSync } from 'node:fs';

const LANG = '{{ $l := or .Data.lang "en" }}';
const NAME = '{{ with .Data.name }} {{ . }}{{ end }}';

// One entry per Supabase template. {name} becomes the user's first name.
const EMAILS = {
  recovery: {
    url: '{{ .ConfirmationURL }}',
    en: {
      subject: 'Reset your Lunaria password',
      title: 'Reset your password',
      hi: `Hi${NAME},`,
      body: 'Someone asked to reset the password of your Lunaria account. If it was you, choose a new one below. The link works for one hour.',
      cta: 'Choose a new password',
      ignore: 'If you did not ask for this, you can ignore this email: your password stays the same.',
    },
    fr: {
      subject: 'Réinitialise ton mot de passe Lunaria',
      title: 'Réinitialise ton mot de passe',
      hi: `Bonjour${NAME},`,
      body: 'Une réinitialisation du mot de passe de ton compte Lunaria a été demandée. Si c’est toi, choisis-en un nouveau ci-dessous. Le lien est valable une heure.',
      cta: 'Choisir un nouveau mot de passe',
      ignore: 'Si tu n’as rien demandé, ignore cet e-mail : ton mot de passe ne change pas.',
    },
    it: {
      subject: 'Reimposta la password di Lunaria',
      title: 'Reimposta la password',
      hi: `Ciao${NAME},`,
      body: 'È stato chiesto di reimpostare la password del tuo account Lunaria. Se sei stata tu, scegline una nuova qui sotto. Il link è valido per un’ora.',
      cta: 'Scegli una nuova password',
      ignore: 'Se non l’hai chiesto tu, ignora questa email: la tua password non cambia.',
    },
  },
  confirmation: {
    url: '{{ .ConfirmationURL }}',
    en: {
      subject: 'Welcome to Lunaria: confirm your email',
      title: 'Welcome to Lunaria',
      hi: `Hi${NAME},`,
      body: 'Confirm your email to finish creating your account. Lunaria is free and private: only you can see your cycle.',
      cta: 'Confirm my email',
      ignore: 'If you did not sign up for Lunaria, you can ignore this email.',
    },
    fr: {
      subject: 'Bienvenue sur Lunaria : confirme ton e-mail',
      title: 'Bienvenue sur Lunaria',
      hi: `Bonjour${NAME},`,
      body: 'Confirme ton e-mail pour terminer la création de ton compte. Lunaria est gratuit et privé : toi seule vois ton cycle.',
      cta: 'Confirmer mon e-mail',
      ignore: 'Si tu ne t’es pas inscrite sur Lunaria, ignore cet e-mail.',
    },
    it: {
      subject: 'Benvenuta su Lunaria: conferma la tua email',
      title: 'Benvenuta su Lunaria',
      hi: `Ciao${NAME},`,
      body: 'Conferma la tua email per completare la creazione dell’account. Lunaria è gratuito e privato: solo tu vedi il tuo ciclo.',
      cta: 'Conferma la mia email',
      ignore: 'Se non ti sei registrata a Lunaria, ignora questa email.',
    },
  },
  email_change: {
    url: '{{ .ConfirmationURL }}',
    en: {
      subject: 'Confirm your new email for Lunaria',
      title: 'Confirm your new email',
      hi: `Hi${NAME},`,
      body: 'Confirm that you want to use {{ .NewEmail }} for your Lunaria account.',
      cta: 'Confirm new email',
      ignore: 'If you did not ask for this, you can ignore this email.',
    },
    fr: {
      subject: 'Confirme ta nouvelle adresse pour Lunaria',
      title: 'Confirme ta nouvelle adresse',
      hi: `Bonjour${NAME},`,
      body: 'Confirme que tu veux utiliser {{ .NewEmail }} pour ton compte Lunaria.',
      cta: 'Confirmer la nouvelle adresse',
      ignore: 'Si tu n’as rien demandé, ignore cet e-mail.',
    },
    it: {
      subject: 'Conferma la nuova email per Lunaria',
      title: 'Conferma la nuova email',
      hi: `Ciao${NAME},`,
      body: 'Conferma che vuoi usare {{ .NewEmail }} per il tuo account Lunaria.',
      cta: 'Conferma la nuova email',
      ignore: 'Se non l’hai chiesto tu, ignora questa email.',
    },
  },
  magic_link: {
    url: '{{ .ConfirmationURL }}',
    en: {
      subject: 'Your Lunaria sign-in link',
      title: 'Your sign-in link',
      hi: `Hi${NAME},`,
      body: 'Tap the button to sign in to Lunaria. The link works once, for one hour.',
      cta: 'Sign in to Lunaria',
      ignore: 'If you did not ask for this, you can ignore this email.',
    },
    fr: {
      subject: 'Ton lien de connexion Lunaria',
      title: 'Ton lien de connexion',
      hi: `Bonjour${NAME},`,
      body: 'Touche le bouton pour te connecter à Lunaria. Le lien fonctionne une fois, pendant une heure.',
      cta: 'Me connecter à Lunaria',
      ignore: 'Si tu n’as rien demandé, ignore cet e-mail.',
    },
    it: {
      subject: 'Il tuo link di accesso a Lunaria',
      title: 'Il tuo link di accesso',
      hi: `Ciao${NAME},`,
      body: 'Tocca il pulsante per accedere a Lunaria. Il link funziona una volta, per un’ora.',
      cta: 'Accedi a Lunaria',
      ignore: 'Se non l’hai chiesto tu, ignora questa email.',
    },
  },
  reauthentication: {
    code: '{{ .Token }}',
    en: {
      subject: 'Your Lunaria confirmation code',
      title: 'Your confirmation code',
      hi: `Hi${NAME},`,
      body: 'Enter this code in Lunaria to confirm it is you:',
      ignore: 'If you did not ask for this, you can ignore this email.',
    },
    fr: {
      subject: 'Ton code de confirmation Lunaria',
      title: 'Ton code de confirmation',
      hi: `Bonjour${NAME},`,
      body: 'Saisis ce code dans Lunaria pour confirmer que c’est bien toi :',
      ignore: 'Si tu n’as rien demandé, ignore cet e-mail.',
    },
    it: {
      subject: 'Il tuo codice di conferma Lunaria',
      title: 'Il tuo codice di conferma',
      hi: `Ciao${NAME},`,
      body: 'Inserisci questo codice in Lunaria per confermare che sei tu:',
      ignore: 'Se non l’hai chiesto tu, ignora questa email.',
    },
  },
};

const FOOTER = {
  en: 'Lunaria · a private cycle tracker',
  fr: 'Lunaria · ton suivi de cycle privé',
  it: 'Lunaria · il tuo diario del ciclo privato',
};

// Picks one string per language at send time.
function pick(fn) {
  return `{{ if eq $l "fr" }}${fn('fr')}{{ else if eq $l "it" }}${fn('it')}{{ else }}${fn('en')}{{ end }}`;
}

const INK = '#2a1a33';
const INK2 = '#6e5a74';
const BG = '#f6edf1';
const CARD = '#fffafc';
const ROSE = '#c8324f';
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

function html(key) {
  const e = EMAILS[key];
  const action = e.code
    ? `<p style="margin:24px 0 8px;font-family:${SERIF};font-size:38px;letter-spacing:8px;color:${INK};text-align:center;">${e.code}</p>`
    : `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px auto 8px;">
          <tr><td align="center" bgcolor="${ROSE}" style="border-radius:999px;">
            <a href="${e.url}" style="display:inline-block;padding:15px 30px;font-family:${SANS};font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">${pick((l) => e[l].cta)}</a>
          </td></tr>
        </table>`;

  return `${LANG}<!doctype html>
<html lang="{{ $l }}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${pick((l) => e[l].title)}</title>
</head>
<body style="margin:0;padding:0;background:${BG};">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${BG}" style="background:${BG};">
  <tr><td align="center" style="padding:32px 16px 40px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:480px;">
      <tr><td align="center" style="padding-bottom:4px;">
        <img src="{{ .SiteURL }}/email/moonpods.png" width="120" height="120" alt="" style="display:block;border:0;">
      </td></tr>
      <tr><td align="center" style="padding-bottom:18px;">
        <img src="{{ .SiteURL }}/email/wordmark.png" width="150" alt="Lunaria" style="display:block;border:0;font-family:${SERIF};font-size:32px;font-style:italic;color:${INK};">
      </td></tr>
      <tr><td style="background:${CARD};border-radius:24px;padding:34px 30px 30px;">
        <h1 style="margin:0 0 16px;font-family:${SERIF};font-size:28px;font-weight:normal;line-height:1.2;color:${INK};">${pick((l) => e[l].title)}</h1>
        <p style="margin:0 0 10px;font-family:${SANS};font-size:16px;line-height:1.55;color:${INK};">${pick((l) => e[l].hi)}</p>
        <p style="margin:0;font-family:${SANS};font-size:16px;line-height:1.55;color:${INK};">${pick((l) => e[l].body)}</p>
        ${action}
        <p style="margin:22px 0 0;font-family:${SANS};font-size:13px;line-height:1.5;color:${INK2};">${pick((l) => e[l].ignore)}</p>
      </td></tr>
      <tr><td align="center" style="padding-top:20px;font-family:${SANS};font-size:12px;color:${INK2};">${pick((l) => FOOTER[l])}</td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function subject(key) {
  return `${LANG}${pick((l) => EMAILS[key][l].subject)}`;
}

const keys = Object.keys(EMAILS);

if (process.argv.includes('--json')) {
  const patch = {};
  for (const k of keys) {
    patch[`mailer_subjects_${k}`] = subject(k);
    patch[`mailer_templates_${k}_content`] = html(k);
  }
  process.stdout.write(JSON.stringify(patch));
} else {
  mkdirSync('supabase/email', { recursive: true });
  for (const k of keys) {
    writeFileSync(`supabase/email/${k}.html`, html(k));
    writeFileSync(`supabase/email/${k}.subject.txt`, subject(k) + '\n');
  }
  console.log('wrote', keys.length, 'templates to supabase/email/');
}
