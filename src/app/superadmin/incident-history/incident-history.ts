import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { EmergencyRequest } from '../../model/emergency';
import { EmergencyRequestService } from '../../core/rescue_request.service';
import { AuthService } from '../../core/auth.service';

import { Chart, registerables } from 'chart.js';
import { saveAs } from 'file-saver';

import * as XLSX from 'xlsx';

// DOCX imports for Word export
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  ImageRun,
} from 'docx';

Chart.register(...registerables);

@Component({
  selector: 'app-incident-history',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './incident-history.html',
  styleUrls: ['./incident-history.scss'],
})
export class IncidentHistory implements OnInit, OnDestroy {
  activeTab: 'all' | 'resolved' | 'cancelled' = 'all';

  allRequests: EmergencyRequest[] = []; // resolved + cancelled
  resolvedRequests: EmergencyRequest[] = [];
  cancelledRequests: EmergencyRequest[] = [];

  filteredAllRequests: EmergencyRequest[] = [];
  filteredResolvedRequests: EmergencyRequest[] = [];
  filteredCancelledRequests: EmergencyRequest[] = [];

  searchTerm: string = '';
  selectedRequests: EmergencyRequest[] = [];
  showBulkMenu = false;

  requestToView?: EmergencyRequest;

  requestStatusChart?: Chart;
  requestEventBarChart?: Chart;

  constructor(
    private emergencyRequestService: EmergencyRequestService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    await this.loadRequests();
  }

  ngOnDestroy() {
    this.requestStatusChart?.destroy();
    this.requestEventBarChart?.destroy();
  }

  async loadRequests() {
    try {
      const fetchedRequests =
        await this.emergencyRequestService.getRequestResolved();

      this.resolvedRequests = fetchedRequests.filter((r) =>
        ['resolved', 'completed'].includes(r.status?.toLowerCase() || '')
      );

      this.cancelledRequests = fetchedRequests.filter(
        (r) => r.status?.toLowerCase() === 'cancelled'
      );

      this.allRequests = [...this.resolvedRequests, ...this.cancelledRequests];

      this.applyFilters();
      this.updateMonthlyEventBarChart(this.allRequests);
    } catch (error) {
      console.error('Error loading requests:', error);
    }
  }

  applyFilters() {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredResolvedRequests = this.filterBySearch(
      this.resolvedRequests,
      term
    );

    this.filteredCancelledRequests = this.filterBySearch(
      this.cancelledRequests,
      term
    );

    this.filteredAllRequests = this.filterBySearch(this.allRequests, term);

    this.selectedRequests = this.selectedRequests.filter((selected) =>
      this.getCurrentFilteredRequests().some((r) => r.id === selected.id)
    );

    const currentRequests = this.getCurrentFilteredRequests();
    this.updateRequestStatusPieChart(currentRequests);
    this.updateMonthlyEventBarChart(currentRequests);
  }

  filterBySearch(
    requests: EmergencyRequest[],
    term: string
  ): EmergencyRequest[] {
    if (!term) return requests;

    return requests.filter(
      (req) =>
        (req.name?.toLowerCase().includes(term) ?? false) ||
        (req.description?.toLowerCase().includes(term) ?? false) ||
        (req.status?.toLowerCase().includes(term) ?? false)
    );
  }

  setTab(tab: 'all' | 'resolved' | 'cancelled') {
    this.activeTab = tab;
    this.selectedRequests = [];
    this.applyFilters();
  }

  getCurrentFilteredRequests(): EmergencyRequest[] {
    switch (this.activeTab) {
      case 'resolved':
        return this.filteredResolvedRequests;
      case 'cancelled':
        return this.filteredCancelledRequests;
      default:
        return this.filteredAllRequests;
    }
  }

  isChecked(req: EmergencyRequest): boolean {
    return this.selectedRequests.some((selected) => selected.id === req.id);
  }

  setChecked(req: EmergencyRequest, event: any) {
    if (event.target.checked) {
      if (!this.isChecked(req)) {
        this.selectedRequests.push(req);
      }
    } else {
      this.selectedRequests = this.selectedRequests.filter(
        (selected) => selected.id !== req.id
      );
    }
  }

  isAllSelected(): boolean {
    const currentRequests = this.getCurrentFilteredRequests();
    return (
      currentRequests.length > 0 &&
      currentRequests.every((r) => this.isChecked(r))
    );
  }

  toggleSelectAllRequests(event: any) {
    const checked = event.target.checked;
    const currentRequests = this.getCurrentFilteredRequests();

    if (checked) {
      this.selectedRequests = [
        ...this.selectedRequests,
        ...currentRequests.filter(
          (r) => !this.selectedRequests.some((sel) => sel.id === r.id)
        ),
      ];
    } else {
      this.selectedRequests = this.selectedRequests.filter(
        (sel) => !currentRequests.some((r) => r.id === sel.id)
      );
    }
  }

  toggleBulkMenu(event: MouseEvent) {
    event.stopPropagation();
    this.showBulkMenu = !this.showBulkMenu;
  }

  selectBy(criteria: 'resolved' | 'cancelled' | 'all' | 'none') {
    switch (criteria) {
      case 'resolved':
        this.selectedRequests = [...this.resolvedRequests];
        break;
      case 'cancelled':
        this.selectedRequests = [...this.cancelledRequests];
        break;
      case 'all':
        this.selectedRequests = [...this.allRequests];
        break;
      case 'none':
        this.selectedRequests = [];
        break;
    }
    this.showBulkMenu = false;
  }

  viewRequest(req: EmergencyRequest) {
    this.requestToView = req;
  }

  closeView() {
    this.requestToView = undefined;
  }

  deleteSelectedRequests() {
    console.log('Deleting:', this.selectedRequests);
    this.selectedRequests = [];
  }

  updateMonthlyEventBarChart(requests: EmergencyRequest[]) {
    const monthLabels: string[] = [];
    const monthMap: Map<string, number> = new Map();

    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('default', {
        month: 'short',
        year: 'numeric',
      });
      monthLabels.push(label);
      monthMap.set(label, monthLabels.length - 1);
    }

    const eventSet = new Set<string>();
    requests.forEach((req) => {
      if (req.event) eventSet.add(req.event);
    });

    const events = Array.from(eventSet);
    const countsPerEvent: { [event: string]: number[] } = {};

    events.forEach((event) => {
      countsPerEvent[event] = new Array(monthLabels.length).fill(0);
    });

    requests.forEach((req) => {
      if (!req.timestamp || !req.event) return;
      const date = req.timestamp.toDate
        ? req.timestamp.toDate()
        : new Date(req.timestamp);
      const label = date.toLocaleString('default', {
        month: 'short',
        year: 'numeric',
      });

      const index = monthMap.get(label);
      if (index !== undefined) {
        countsPerEvent[req.event][index]++;
      }
    });

    const colors = [
      '#FF6384',
      '#36A2EB',
      '#6d6b65ff',
      '#4BC0C0',
      '#9966FF',
      '#FF9F40',
      '#C9CBCF',
      '#8E44AD',
    ];

    const datasets = events.map((event, i) => ({
      label: event,
      data: countsPerEvent[event],
      backgroundColor: colors[i % colors.length],
    }));

    if (this.requestEventBarChart) {
      this.requestEventBarChart.destroy();
    }

    this.requestEventBarChart = new Chart('requestStatusBarChart', {
      type: 'bar',
      data: {
        labels: monthLabels,
        datasets: datasets,
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { mode: 'index', intersect: false },
        },
        scales: {
          x: { stacked: true, title: { display: true, text: 'Month' } },
          y: {
            stacked: true,
            beginAtZero: true,
            title: { display: true, text: 'Number of Requests' },
            ticks: { stepSize: 1 },
          },
        },
      },
    });
  }

  updateRequestStatusPieChart(requests: EmergencyRequest[]) {
    let resolved = 0,
      cancelled = 0;

    requests.forEach((req) => {
      const status = req.status?.toLowerCase() || '';
      if (['resolved', 'completed'].includes(status)) {
        resolved++;
      } else if (status === 'cancelled') {
        cancelled++;
      }
    });

    if (this.requestStatusChart) {
      this.requestStatusChart.destroy();
    }

    this.requestStatusChart = new Chart('requestStatusChart', {
      type: 'pie',
      data: {
        labels: ['Resolved', 'Cancelled'],
        datasets: [
          {
            data: [resolved, cancelled],
            backgroundColor: ['#4CAF50', '#F44336'],
            hoverOffset: 14,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 14,
              padding: 16,
            },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed || 0;
                return `${label}: ${value}`;
              },
            },
          },
        },
      },
    });
  }

  // --- WORD EXPORT RELATED ---

  // Fetches image URL and returns ImageRun or null if failed
  private async getImageRun(imageUrl: string): Promise<ImageRun | null> {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        console.error('Failed to fetch image:', response.statusText);
        return null;
      }

      const blob = await response.blob();

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const arrayBuffer = reader.result as ArrayBuffer;
          const uint8Array = new Uint8Array(arrayBuffer);

          // Detect image type by extension, normalize 'jpeg' to 'jpg'
          let type: 'png' | 'jpg' = 'png'; // default png
          if (
            imageUrl.toLowerCase().endsWith('.jpg') ||
            imageUrl.toLowerCase().endsWith('.jpeg')
          ) {
            type = 'jpg'; // use 'jpg' instead of 'jpeg'
          }

          resolve(
            new ImageRun({
              data: uint8Array,
              transformation: { width: 100, height: 100 },
              type: type,
            })
          );
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });
    } catch (e) {
      console.error('Failed to load image', e);
      return null;
    }
  }

  async exportToWord() {
    const rows = this.getCurrentFilteredRequests();

    if (rows.length === 0) {
      alert('No data to export!');
      return;
    }

    // Create header cells with bold text
    const headerCells = [
      'ID',
      'Name',
      'Address',
      'Contact Number',
      'Description',
      'Email',
      'Event',
      'Image',
      'Status',
      'Timestamp',
    ].map(
      (header) =>
        new TableCell({
          width: { size: 1000, type: WidthType.DXA },
          children: [
            new Paragraph({
              children: [new TextRun({ text: header, bold: true })],
            }),
          ],
        })
    );

    const tableRows: TableRow[] = [];
    tableRows.push(new TableRow({ children: headerCells }));

    for (const req of rows) {
      let imageCellChildren: Paragraph[] = [new Paragraph('No Image')];

      if (req.image) {
        const imageRun = await this.getImageRun(req.image);
        if (imageRun) {
          imageCellChildren = [new Paragraph({ children: [imageRun] })];
        }
      }

      const rowCells = [
        req.id ?? '',
        req.name ?? '',
        req.address ?? '',
        req.contactNumber ?? '',
        req.description ?? '',
        req.email ?? '',
        req.event ?? '',
        req.image ?? '',
        req.status ?? '',
        req.timestamp
          ? req.timestamp.toDate
            ? req.timestamp.toDate().toLocaleString()
            : new Date(req.timestamp).toLocaleString()
          : '',
      ].map((text, i) => {
        if (i === 7) {
          // Image cell
          return new TableCell({
            children: imageCellChildren,
            verticalAlign: 'center',
            width: { size: 1200, type: WidthType.DXA },
          });
        }
        return new TableCell({
          children: [new Paragraph(String(text))],
        });
      });

      tableRows.push(new TableRow({ children: rowCells }));
    }

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: 'Emergency Requests Report',
              heading: 'Heading1',
            }),
            new Table({
              rows: tableRows,
            }),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, 'emergency_requests_report.docx');
  }

  exportToExcel() {
    const rows = this.getCurrentFilteredRequests();

    if (rows.length === 0) {
      alert('No data to export!');
      return;
    }

    const worksheetData = [
      [
        'ID',
        'Name',
        'Address',
        'Contact Number',
        'Description',
        'Email',
        'Event',
        'Image URL',
        'Status',
        'Timestamp',
      ],
      ...rows.map((req) => [
        req.id ?? '',
        req.name ?? '',
        req.address ?? '',
        req.contactNumber ?? '',
        req.description ?? '',
        req.email ?? '',
        req.event ?? '',
        req.image ?? '',
        req.status ?? '',
        req.timestamp
          ? req.timestamp.toDate
            ? req.timestamp.toDate().toLocaleString()
            : new Date(req.timestamp).toLocaleString()
          : '',
      ]),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Requests');

    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/octet-stream',
    });

    saveAs(blob, 'emergency_requests_report.xlsx');
  }
}
