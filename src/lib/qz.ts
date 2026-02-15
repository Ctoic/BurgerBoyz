import qz from "qz-tray";

let connectPromise: Promise<void> | null = null;

const prepareSecurity = () => {
  try {
    qz.security.setCertificatePromise(() => Promise.resolve(""));
    qz.security.setSignaturePromise(() => Promise.resolve(""));
  } catch {
    // QZ might already be configured or unavailable in this environment.
  }
};

export const ensureQzConnection = async () => {
  if (qz.websocket.isActive()) return;
  if (!connectPromise) {
    prepareSecurity();
    connectPromise = qz.websocket.connect().finally(() => {
      connectPromise = null;
    });
  }
  await connectPromise;
};

export const printRaw = async (printerName: string, data: string) => {
  if (!printerName) {
    throw new Error("Printer name is not configured.");
  }
  await ensureQzConnection();
  const config = qz.configs.create(printerName, { encoding: "CP437" });
  return qz.print(config, [{ type: "raw", format: "command", data }]);
};
