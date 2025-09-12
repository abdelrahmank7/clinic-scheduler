// src/services/report-service.js
import { format } from "date-fns";

export class ReportService {
  static generatePaymentReportData(payments, revenueSharing) {
    const totalRevenue = payments.reduce(
      (sum, payment) => sum + (Number(payment.amount) || 0),
      0
    );

    const clinicRevenue =
      totalRevenue * (revenueSharing.clinicPercentage / 100 || 0);
    const physicianRevenue =
      totalRevenue * (revenueSharing.physicianPercentage / 100 || 0);

    const revenueByMethod = payments.reduce((acc, payment) => {
      acc[payment.paymentMethod] =
        (acc[payment.paymentMethod] || 0) + (Number(payment.amount) || 0);
      return acc;
    }, {});

    const revenueByClient = payments.reduce((acc, payment) => {
      acc[payment.clientName] =
        (acc[payment.clientName] || 0) + (Number(payment.amount) || 0);
      return acc;
    }, {});

    return {
      totalRevenue,
      clinicRevenue,
      physicianRevenue,
      revenueByMethod,
      revenueByClient,
      paymentCount: payments.length,
    };
  }

  static generateHTMLReport(reportData, options = {}) {
    const {
      reportDate,
      reportRange,
      revenueSharing,
      totalRevenue,
      clinicRevenue,
      physicianRevenue,
      revenueByMethod,
      revenueByClient,
      payments,
    } = reportData;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Report - ${reportDate}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            margin: 20px; 
            line-height: 1.6;
          }
          
          .header { 
            text-align: center; 
            margin-bottom: 30px; 
            padding-bottom: 20px;
            border-bottom: 2px solid #e5e7eb;
          }
          
          .summary { 
            margin-bottom: 30px; 
          }
          
          .section { 
            margin-bottom: 30px; 
          }
          
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 20px;
            font-size: 14px;
          }
          
          th, td { 
            border: 1px solid #ddd; 
            padding: 12px 8px; 
            text-align: left; 
          }
          
          th { 
            background-color: #f9fafb; 
            font-weight: 600;
          }
          
          .revenue-split { 
            display: flex; 
            flex-wrap: wrap;
            gap: 20px;
            margin-bottom: 30px; 
          }
          
          .revenue-box { 
            border: 1px solid #ddd; 
            padding: 20px; 
            flex: 1;
            min-width: 250px;
            border-radius: 8px;
          }
          
          @media print {
            body { font-size: 12px; margin: 10px; }
            .no-print { display: none !important; }
            table { font-size: 11px; }
            th, td { padding: 6px 4px; }
          }
          
          @media (max-width: 768px) {
            body { margin: 10px; font-size: 13px; }
            .header h1 { font-size: 24px; }
            .revenue-split { flex-direction: column; gap: 15px; }
            table { font-size: 12px; }
            th, td { padding: 8px 6px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Payment Report</h1>
          <p>Generated on: ${reportDate}</p>
          <p>Date Range: ${reportRange}</p>
        </div>
        
        <div class="summary">
          <h2>Financial Summary</h2>
          <div class="revenue-split">
            <div class="revenue-box">
              <h3>Clinic Revenue</h3>
              <p style="font-size: 24px; font-weight: bold; color: #10b981;">
                $${clinicRevenue.toFixed(2)}
              </p>
              <p>${revenueSharing.clinicPercentage}% of total</p>
            </div>
            <div class="revenue-box">
              <h3>Physician Revenue</h3>
              <p style="font-size: 24px; font-weight: bold; color: #3b82f6;">
                $${physicianRevenue.toFixed(2)}
              </p>
              <p>${revenueSharing.physicianPercentage}% of total</p>
            </div>
          </div>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center;">
            <h3 style="margin: 0 0 10px 0;">Total Revenue</h3>
            <p style="font-size: 28px; font-weight: bold; color: #8b5cf6; margin: 0;">
              $${totalRevenue.toFixed(2)}
            </p>
            <p style="margin: 5px 0 0 0;">From ${payments.length} payments</p>
          </div>
        </div>
        
        <div class="section">
          <h2>Revenue by Payment Method</h2>
          <table>
            <thead>
              <tr>
                <th>Payment Method</th>
                <th>Amount</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(revenueByMethod)
                .map(([method, amount]) => {
                  const pct = totalRevenue
                    ? ((amount / totalRevenue) * 100).toFixed(1)
                    : "0.0";
                  return `
                <tr>
                  <td>${method.charAt(0).toUpperCase() + method.slice(1)}</td>
                  <td>$${amount.toFixed(2)}</td>
                  <td>${pct}%</td>
                </tr>
              `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
        
        <div class="section">
          <h2>Top Clients by Revenue</h2>
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Amount</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(revenueByClient)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([client, amount]) => {
                  const pct = totalRevenue
                    ? ((amount / totalRevenue) * 100).toFixed(1)
                    : "0.0";
                  return `
                  <tr>
                    <td>${client}</td>
                    <td>$${amount.toFixed(2)}</td>
                    <td>${pct}%</td>
                  </tr>
                `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
        
        <div class="section">
          <h2>Payment Details</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Client</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Session Date</th>
              </tr>
            </thead>
            <tbody>
              ${payments
                .map(
                  (payment) => `
                <tr>
                  <td>${format(payment.createdAt, "MMM dd, yyyy")}</td>
                  <td>${payment.clientName}</td>
                  <td>$${(Number(payment.amount) || 0).toFixed(2)}</td>
                  <td>${
                    payment.paymentMethod
                      ? payment.paymentMethod.charAt(0).toUpperCase() +
                        payment.paymentMethod.slice(1)
                      : ""
                  }</td>
                  <td>${format(payment.sessionDate, "MMM dd, yyyy")}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;" class="no-print">
          <p>Generated by Clinic Management System</p>
          <p>This report contains confidential financial information</p>
        </div>
      </body>
      </html>
    `;

    return htmlContent;
  }
}
