import * as Linking from 'expo-linking';
import { appAlert } from './alert';

// Verified Agent status is no longer self-checkout -- an agent reaches out
// here, an admin reviews the request manually (outside the automated
// payment flow) and, if approved, contacts the agent separately to collect
// the fee before granting verification. agents@easyfen.com already exists
// as the app's agent-facing contact address (used throughout the legal
// pages) -- this is the first place it becomes an actual tappable action
// rather than just text.
export async function requestAgentVerification(fullName: string | null | undefined) {
  const greeting = fullName?.trim() ? `Hi, I'm ${fullName.trim()}.\n\n` : '';
  const body = `${greeting}I'd like to request Verified Agent status for my Easyfen account.\n\nA bit about my agency / how long I've been operating:\n\n`;
  const url = `mailto:agents@easyfen.com?subject=${encodeURIComponent('Verified Agent Request')}&body=${encodeURIComponent(body)}`;

  try {
    await Linking.openURL(url);
  } catch {
    appAlert(
      'Could not open email',
      "We couldn't open your email app. Please email agents@easyfen.com directly to request verification."
    );
  }
}
