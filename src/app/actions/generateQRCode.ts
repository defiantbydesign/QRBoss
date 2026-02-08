"use server";

import QRCode from "qrcode";

export async function generateQRCode(
  previousState: { selectedOption: string; url: string; name: string; email: string; qrCode: string | null; qrCodeSvg: string | null },
  formData: FormData
) {
  const urlInput = formData.get('urlInput') as string;
  const vcardInput = formData.get('vcard') as string | null;
  const vcardFN = formData.get('vcardFN') as string | null;
  const vcardEMAIL = formData.get('vcardEMAIL') as string | null;
  const vcardTEL = formData.get('vcardTEL') as string | null;
  const vcardORG = formData.get('vcardORG') as string | null;
  const vcardTITLE = formData.get('vcardTITLE') as string | null;
  const vcardURL = formData.get('vcardURL') as string | null;
  const vcardADR = formData.get('vcardADR') as string | null;
  const vcardNOTE = formData.get('vcardNOTE') as string | null;

  let qrCodeDataUrl: string | null = null;
  let qrCodeSvg: string | null = null;

  // prefer vCard payload when present
  const content = vcardInput?.toString() || urlInput;

  if (content) {
    try {
      // Generate PNG as data URL for display
      qrCodeDataUrl = await QRCode.toDataURL(content, {
        width: 300,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });

      // Generate SVG string for download. Use 'svg' type and avoid width option
      // which can cause internal allocation errors for SVG rendering in this lib.
      qrCodeSvg = await QRCode.toString(content, {
        type: 'svg',
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
    } catch (error) {
      console.error('QR Code generation failed:', error);
    }
  }

  return {
    selectedOption: previousState.selectedOption,
    url: urlInput || '',
    // Treat empty vcardFN/vcardEMAIL as explicit empty values — only fall back when field is missing
    name: formData.has('vcardFN') ? String(formData.get('vcardFN') ?? '') : previousState.name,
    email: formData.has('vcardEMAIL') ? String(formData.get('vcardEMAIL') ?? '') : previousState.email,
    qrCode: qrCodeDataUrl,
    qrCodeSvg: qrCodeSvg,
    // echo back parsed vCard fields for client convenience
    vcardFN: vcardFN || null,
    vcardEMAIL: vcardEMAIL || null,
    vcardTEL: vcardTEL || null,
    vcardORG: vcardORG || null,
    vcardTITLE: vcardTITLE || null,
    vcardURL: vcardURL || null,
    vcardADR: vcardADR || null,
    vcardNOTE: vcardNOTE || null,
  };
}
