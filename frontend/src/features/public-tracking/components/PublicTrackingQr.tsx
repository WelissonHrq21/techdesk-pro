import { QRCodeSVG } from "qrcode.react";
import { buildPublicTrackingUrl } from "../utils/publicTrackingUrl";

type PublicTrackingQrProps = {
  publicToken: string;
  origin?: string;
};

export function PublicTrackingQr({
  publicToken,
  origin,
}: PublicTrackingQrProps) {
  const trackingUrl = buildPublicTrackingUrl(publicToken, origin);

  return (
    <div
      className="flex break-inside-avoid flex-col items-center gap-4 rounded-md border border-slate-200 p-4 sm:flex-row sm:items-start print:flex-row print:items-start"
      data-testid="public-tracking-qr"
    >
      <QRCodeSVG
        value={trackingUrl}
        size={120}
        level="M"
        marginSize={2}
        title="QR Code para acompanhamento público da ordem de serviço"
        role="img"
        aria-label="QR Code para acompanhamento público da ordem de serviço"
        className="h-[120px] w-[120px] shrink-0"
      />
      <div className="min-w-0 text-center sm:text-left print:text-left">
        <p className="font-semibold text-slate-950">Acompanhe seu equipamento</p>
        <p className="mt-1 text-sm text-slate-600">
          Escaneie para consultar o andamento da ordem de serviço.
        </p>
        <a
          href={trackingUrl}
          className="mt-3 block break-all text-xs text-sky-700 underline"
        >
          {trackingUrl}
        </a>
      </div>
    </div>
  );
}
