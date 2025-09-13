import React, { useRef } from "react";
import html2pdf from "html2pdf.js";
import "./Invoice.css";

export default function Invoice({
  onClose,
  amount,
  amountReceived,
  operatorName,
  accountNumber,
  countryName,
  statusTransaction,
  dateNow,
  transactionId,
  sendCurrencyIso,
  receiveCurrencyIso,
}) {
  const invoiceRef = useRef();

  const handleDownloadPDF = () => {
    const opt = {
      margin: 0.3,
      filename: `comprovante-${transactionId || Date.now()}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
    };

    html2pdf().set(opt).from(invoiceRef.current).save();
  };

  return (
    <div className="invoice-overlay">
      <div className="invoice-modal">
        <div className="invoice-actions">
          <button className="btn-download" onClick={handleDownloadPDF}>
            📄 Baixar PDF
          </button>
          <button className="btn-close" onClick={onClose}>
            ✖ Fechar
          </button>
        </div>

        <div ref={invoiceRef} className="invoice-container">
          <div className="invoice-header">
            <h1>BERMAX GLOBAL LTDA</h1>
            <p>Comprovante de Transação ✅</p>
          </div>

          <p className="invoice-info">
            Segue abaixo o comprovante da sua recarga realizada com sucesso:
          </p>

          <table className="invoice-table">
            <tbody>
              <tr className="alt">
                <td className="invoice-td"><strong>Tipo transação</strong></td>
                <td className="invoice-td success"><strong>Recarga</strong></td>
              </tr>
              <tr>
                <td className="invoice-td"><strong>País</strong></td>
                <td className="invoice-td">{countryName}</td>
              </tr>
              <tr>
                <td className="invoice-td"><strong>Operadora</strong></td>
                <td className="invoice-td">{operatorName}</td>
              </tr>
              <tr className="alt">
                <td className="invoice-td"><strong>Número</strong></td>
                <td className="invoice-td black"><strong>{accountNumber}</strong></td>
              </tr>
              <tr>
                <td className="invoice-td"><strong>Status</strong></td>
                <td
                  className={`invoice-td ${
                    statusTransaction === "Complete" ? "success" : "error"
                  }`}
                >
                  {statusTransaction}
                </td>
              </tr>
              <tr>
                <td className="invoice-td"><strong>Valor da Recarga</strong></td>
                <td className="invoice-td"><strong>{sendCurrencyIso} {amount}</strong></td>
              </tr>
              <tr>
                <td className="invoice-td"><strong>Valor Recebido</strong></td>
                <td className="invoice-td"><strong>{receiveCurrencyIso} {amountReceived}</strong></td>
              </tr>
              <tr>
                <td className="invoice-td"><strong>Data e Hora</strong></td>
                <td className="invoice-td">{dateNow}</td>
              </tr>
              {transactionId && (
                <tr>
                  <td className="invoice-td"><strong>ID da Transação</strong></td>
                  <td className="invoice-td">{transactionId}</td>
                </tr>
              )}
            </tbody>
          </table>

          <p className="invoice-footer">
            Este é um comprovante eletrônico. Não é necessário respondê-lo.
          </p>
          <p className="invoice-copy">
            © {new Date().getFullYear()} BERMAX GLOBAL LTDA
          </p>
        </div>
      </div>
    </div>
  );
}
