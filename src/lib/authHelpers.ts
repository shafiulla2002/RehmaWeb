/**
 * Phone Authentication & reCAPTCHA Lifecycle Helpers
 * Pure, testable helpers for clear auth error messages and clean reCAPTCHA DOM mounting.
 */

export function formatPhoneAuthError(err: unknown): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code || '')
      : '';
  const rawMessage =
    typeof err === 'object' && err !== null && 'message' in err
      ? String((err as { message?: unknown }).message || '')
      : typeof err === 'string'
      ? err
      : '';

  switch (code) {
    case 'auth/invalid-app-credential':
      return 'Firebase: Error (auth/invalid-app-credential). App verification failed. Please refresh the page and try again, or verify Firebase Fraud Defense / authorized domain configuration.';
    case 'auth/invalid-recaptcha-token':
      return 'Firebase: Error (auth/invalid-recaptcha-token). reCAPTCHA verification token was rejected. Please refresh the page and try sending the OTP again.';
    case 'auth/captcha-check-failed':
      return 'Firebase: Error (auth/captcha-check-failed). reCAPTCHA check failed. Please retry sending the OTP.';
    case 'auth/invalid-phone-number':
      return 'Firebase: Error (auth/invalid-phone-number). Please enter a valid 10-digit Indian mobile number.';
    case 'auth/too-many-requests':
      return 'Firebase: Error (auth/too-many-requests). Too many OTP attempts. Please wait a few minutes before trying again.';
    case 'auth/invalid-verification-code':
      return 'Firebase: Error (auth/invalid-verification-code). The 6-digit OTP is incorrect. Please check and try again.';
    case 'auth/code-expired':
      return 'Firebase: Error (auth/code-expired). This OTP has expired. Please request a new code.';
    case 'auth/network-request-failed':
      return 'Firebase: Error (auth/network-request-failed). Network error while contacting authentication servers. Check your connection and retry.';
    default:
      if (/already been rendered/i.test(rawMessage)) {
        return 'reCAPTCHA session reset required. Please click Send OTP again.';
      }
      return rawMessage || 'Authentication failed. Please try again.';
  }
}

/**
 * Clears all child nodes inside the reCAPTCHA host container so no stale widget DOM remains.
 */
export function clearRecaptchaContainer(containerId = 'recaptcha-container'): void {
  if (typeof document === 'undefined') return;
  const host = document.getElementById(containerId);
  if (host) {
    host.innerHTML = '';
  }
}

/**
 * Creates a fresh child <div> inside the reCAPTCHA host container so repeated
 * RecaptchaVerifier initializations never collide on an already-rendered element.
 */
export function createFreshRecaptchaMount(containerId = 'recaptcha-container'): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const host = document.getElementById(containerId);
  if (!host) return null;
  host.innerHTML = '';
  const mountNode = document.createElement('div');
  host.appendChild(mountNode);
  return mountNode;
}
