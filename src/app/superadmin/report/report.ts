import { Component, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EmergencyReport } from '../../model/report';
import { EmergencyRequest } from '../../model/emergency';
import { ReportService } from '../../core/report.service';
import { EmergencyRequestService } from '../../core/rescue_request.service';

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
    this.fetchReports();
  }

  // Fetch all reports
  async fetchReports() {
    this.loading = true;
    try {
      const allReports = await this.reportService.getReports();
      this.reports = allReports.sort(
        (a, b) =>
          new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime(),
      );
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

  // Apply search + month filter
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

      const matchesSearch = report.generatedBy.fullName
        .toLowerCase()
        .includes(term);

      return matchesMonth && matchesSearch;
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
    this.reportToView = report;
    this.loading = true;
    try {
      if (
        !report.includedRequestIds ||
        report.includedRequestIds.length === 0
      ) {
        this.reportRequests = [];
        return;
      }

      const requestPromises = report.includedRequestIds.map(
        async (requestId) => {
          const req = await this.requestService.getRequestById(requestId);
          return req;
        },
      );

      const requests = await Promise.all(requestPromises);
      this.reportRequests = requests.filter(
        (r): r is EmergencyRequest => r !== null,
      );

      // Sort by timestamp
      this.reportRequests.sort((a, b) => {
        const timeA = a.timestamp?.toDate
          ? a.timestamp.toDate().getTime()
          : new Date(a.timestamp).getTime();
        const timeB = b.timestamp?.toDate
          ? b.timestamp.toDate().getTime()
          : new Date(b.timestamp).getTime();
        return timeA - timeB;
      });
    } catch (err) {
      console.error('Failed to fetch report requests', err);
      this.snackBar.open('Failed to fetch report requests', 'Close', {
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
