const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const MAX_FILE_BYTES = 8 * 1024 * 1024;

type DocumentMetadata = {
  key: string;
  label: string;
  path: string;
  name: string;
  size: number;
  mime_type: string;
};

function matchesSignature(bytes: Uint8Array, mimeType: string) {
  if (mimeType === "application/pdf") {
    return bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
  }
  if (mimeType === "image/png") {
    return bytes.length >= 8 && bytes.slice(0, 8).every((byte, index) => byte === [137, 80, 78, 71, 13, 10, 26, 10][index]);
  }
  if (mimeType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  return false;
}

export async function validateKycDocuments(
  supabase: any,
  userId: string,
  documents: DocumentMetadata[],
) {
  const seen = new Set<string>();

  for (const document of documents) {
    if (seen.has(document.key)) throw new Error(`Document dupliqué : ${document.label}`);
    seen.add(document.key);
    if (!document.path.startsWith(`${userId}/`)) throw new Error("Chemin de document non autorisé");
    if (!ALLOWED_MIME_TYPES.has(document.mime_type)) throw new Error(`Type interdit : ${document.name}`);
    if (document.size < 1 || document.size > MAX_FILE_BYTES) throw new Error(`Taille invalide : ${document.name}`);

    const { data, error } = await supabase.storage.from("kyc-documents").download(document.path);
    if (error || !data) throw new Error(`Document introuvable : ${document.name}`);
    if (data.size !== document.size || data.size > MAX_FILE_BYTES) throw new Error(`Taille incohérente : ${document.name}`);

    const bytes = new Uint8Array(await data.slice(0, 16).arrayBuffer());
    if (!matchesSignature(bytes, document.mime_type)) throw new Error(`Contenu invalide : ${document.name}`);
  }
}