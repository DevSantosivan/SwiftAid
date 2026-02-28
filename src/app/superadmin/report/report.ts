import { Component, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EmergencyReport } from '../../model/report';
import { EmergencyRequest } from '../../model/emergency';
import { ReportService } from '../../core/report.service';
import { EmergencyRequestService } from '../../core/rescue_request.service';
import { saveAs } from 'file-saver';
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  AlignmentType,
} from 'docx';
@Component({
  selector: 'app-report',
  imports: [ReactiveFormsModule, FormsModule, CommonModule],
  templateUrl: './report.html',
  styleUrls: ['./report.scss'],
})
export class Report implements OnInit {
  reports: EmergencyReport[] = [];
  filteredReports: EmergencyReport[] = [];
  loading = false;
  searchTerm = '';

  // Year filtering
  years: number[] = [];
  selectedYear?: number;

  // Monthly filtering
  months = [
    { name: 'January', value: 0 },
    { name: 'February', value: 1 },
    { name: 'March', value: 2 },
    { name: 'April', value: 3 },
    { name: 'May', value: 4 },
    { name: 'June', value: 5 },
    { name: 'July', value: 6 },
    { name: 'August', value: 7 },
    { name: 'September', value: 8 },
    { name: 'October', value: 9 },
    { name: 'November', value: 10 },
    { name: 'December', value: 11 },
  ];
  selectedMonth?: number;

  // Modal
  reportToView?: EmergencyReport;
  reportRequests: EmergencyRequest[] = [];
  defaultAvatar =
    'https://i.pinimg.com/736x/32/e4/61/32e46132a367eb48bb0c9e5d5b659c88.jpg';

  constructor(
    private reportService: ReportService,
    private requestService: EmergencyRequestService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit() {
    this.generateYearOptions();
    this.fetchReports();
  }

  // ✅ Generate year range (pwede balikan kahit anong taon)
  generateYearOptions() {
    const startYear = 2020; // change if needed
    const currentYear = new Date().getFullYear();

    this.years = [];

    for (let year = currentYear; year >= startYear; year--) {
      this.years.push(year);
    }
  }

  // ✅ Fetch all reports
  async fetchReports() {
    this.loading = true;
    try {
      const allReports = await this.reportService.getReports();

      this.reports = allReports.sort((a, b) => {
        const dateA = a.generatedAt?.toDate
          ? a.generatedAt.toDate()
          : new Date(a.generatedAt);

        const dateB = b.generatedAt?.toDate
          ? b.generatedAt.toDate()
          : new Date(b.generatedAt);

        return dateB.getTime() - dateA.getTime();
      });

      this.applyFilters();
    } catch (err) {
      console.error(err);
      this.snackBar.open('Failed to fetch reports', 'Close', {
        duration: 3000,
      });
    } finally {
      this.loading = false;
    }
  }

  // ✅ Apply Month + Year + Search filter
  applyFilters() {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredReports = this.reports.filter((report) => {
      const reportDate = report.generatedAt?.toDate
        ? report.generatedAt.toDate()
        : new Date(report.generatedAt);

      const matchesMonth =
        this.selectedMonth !== undefined
          ? reportDate.getMonth() === this.selectedMonth
          : true;

      const matchesYear =
        this.selectedYear !== undefined
          ? reportDate.getFullYear() === this.selectedYear
          : true;

      const matchesSearch = report.generatedBy.fullName
        .toLowerCase()
        .includes(term);

      return matchesMonth && matchesYear && matchesSearch;
    });
  }

  selectMonth(month?: number) {
    this.selectedMonth = month;
    this.applyFilters();
  }

  async markAsReviewed(report: EmergencyReport) {
    if (!report.id) return;

    this.loading = true;
    try {
      await this.reportService.markAsReviewed(report.id, {
        uid: 'admin123', // replace with real admin id
        fullName: 'Admin Name',
      });

      this.snackBar.open('Report marked as reviewed!', 'Close', {
        duration: 3000,
      });

      this.fetchReports();
    } catch (err) {
      console.error(err);
      this.snackBar.open('Failed to mark as reviewed', 'Close', {
        duration: 3000,
      });
    } finally {
      this.loading = false;
    }
  }

  async viewReport(report: EmergencyReport) {
    this.loading = true;

    try {
      if (
        !report.includedRequestIds ||
        report.includedRequestIds.length === 0
      ) {
        this.snackBar.open('No requests in this report.', 'Close', {
          duration: 3000,
        });
        return;
      }

      const requestPromises = report.includedRequestIds.map((requestId) =>
        this.requestService.getRequestById(requestId),
      );

      const requests = await Promise.all(requestPromises);

      const validRequests = requests.filter(
        (r): r is EmergencyRequest => r !== null,
      );

      // Sort by timestamp
      validRequests.sort((a, b) => {
        const timeA = a.timestamp?.toDate
          ? a.timestamp.toDate().getTime()
          : new Date(a.timestamp).getTime();

        const timeB = b.timestamp?.toDate
          ? b.timestamp.toDate()
          : new Date(b.timestamp);

        return timeA - timeB;
      });

      // ========== CREATE TABLE ==========
      const tableRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph('Resident')] }),
            new TableCell({ children: [new Paragraph('Contact')] }),
            new TableCell({ children: [new Paragraph('Event')] }),
            new TableCell({ children: [new Paragraph('Event Type')] }),
            new TableCell({ children: [new Paragraph('Status')] }),
            new TableCell({ children: [new Paragraph('Date')] }),
          ],
        }),
        ...validRequests.map(
          (req) =>
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph(req.name || '-')],
                }),
                new TableCell({
                  children: [new Paragraph(req.contactNumber || '-')],
                }),
                new TableCell({
                  children: [new Paragraph(req.event || '-')],
                }),
                new TableCell({
                  children: [new Paragraph(req.eventType || '-')],
                }), // <--- NEW
                new TableCell({
                  children: [new Paragraph(req.status || '-')],
                }),
                new TableCell({
                  children: [
                    new Paragraph(
                      req.timestamp?.toDate
                        ? req.timestamp.toDate().toLocaleString()
                        : new Date(req.timestamp).toLocaleString(),
                    ),
                  ],
                }),
              ],
            }),
        ),
      ];

      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `STAFF REPORT`,
                    bold: true,
                    size: 32,
                  }),
                ],
              }),
              new Paragraph({
                text: `Generated by: ${report.generatedBy.fullName}`,
              }),
              new Paragraph({
                text: `Generated at: ${
                  report.generatedAt?.toDate
                    ? report.generatedAt.toDate().toLocaleString()
                    : new Date(report.generatedAt).toLocaleString()
                }`,
                spacing: { after: 300 },
              }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: tableRows,
              }),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `staff-report-${Date.now()}.docx`);
    } catch (err) {
      console.error(err);
      this.snackBar.open('Failed to generate report', 'Close', {
        duration: 3000,
      });
    } finally {
      this.loading = false;
    }
  }

  closeView() {
    this.reportToView = undefined;
    this.reportRequests = [];
  }

  generateReportDocs() {
    if (this.filteredReports.length === 0) {
      this.snackBar.open('No reports to generate!', 'Close', {
        duration: 3000,
      });
      return;
    }

    console.log('Generating docs for:', this.filteredReports);

    this.snackBar.open('Docs generation started (check console)', 'Close', {
      duration: 3000,
    });

    // TODO: Integrate jsPDF / CSV export if needed
  }
}
