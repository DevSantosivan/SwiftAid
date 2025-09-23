import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { EmergencyRequest } from '../../model/emergency';
import { EmergencyRequestService } from '../../core/rescue_request.service';
import { AuthService } from '../../core/auth.service';

import * as L from 'leaflet';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

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
  VerticalAlign,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from 'docx';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-incident-history',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './incident-history.html',
  styleUrls: ['./incident-history.scss'],
})
export class IncidentHistory implements OnInit, OnDestroy, AfterViewInit {
  [x: string]: any;
  activeTab: 'all' | 'resolved' | 'cancelled' = 'all';

  allRequests: EmergencyRequest[] = [];
  resolvedRequests: EmergencyRequest[] = [];
  cancelledRequests: EmergencyRequest[] = [];

  filteredAllRequests: EmergencyRequest[] = [];
  filteredResolvedRequests: EmergencyRequest[] = [];
  filteredCancelledRequests: EmergencyRequest[] = [];

  selectedRequests: EmergencyRequest[] = [];
  requestToView?: EmergencyRequest;

  showBulkMenu = false;
  searchTerm = '';

  filterStartDate?: string; // <-- Added start date filter
  filterEndDate?: string; // <-- Added end date filter

  // Leaflet map related
  private map?: L.Map;
  private markersLayer?: L.FeatureGroup;
  hoverMarker?: L.Marker;

  constructor(
    private emergencyRequestService: EmergencyRequestService,
    private authService: AuthService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadRequests();
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  // =============== DATE FILTER HANDLER =================

  onDateFilterChange(): void {
    this.applyFilters();
  }

  // =============== MAP HOVER METHODS ==================

  onRequestHover(req: EmergencyRequest) {
    if (!this.map) return;

    if (this.hoverMarker) {
      this.map.removeLayer(this.hoverMarker);
    }

    if (req.latitude != null && req.longitude != null) {
      const iconHtml = `
      <div style="
        width: 40px; 
        height: 40px; 
        border-radius: 50%; 
        overflow: hidden; 
        border: 2px solid #555;
        box-shadow: 0 0 5px rgba(0,0,0,0.3);
      ">
        <img 
          src="${req.image || 'assets/default-marker-icon.png'}" 
          alt="incident" 
          style="width: 100%; height: 100%; object-fit: cover;"
        />
      </div>
    `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40],
      });

      this.hoverMarker = L.marker([req.latitude, req.longitude], {
        icon: customIcon,
        riseOnHover: true,
      }).addTo(this.map);

      const popupContent = `
      <strong>${req.name}</strong><br/>
      Status: ${req.status}<br/>
      Staff: ${req.staffFullName || ''}
    `;

      this.hoverMarker.bindPopup(popupContent).openPopup();

      this.map.panTo([req.latitude, req.longitude], { animate: true });
    }
  }

  onRequestHoverOut() {
    if (this.hoverMarker && this.map) {
      this.map.removeLayer(this.hoverMarker);
      this.hoverMarker = undefined;
    }
  }

  // =====================
  // MAP METHODS
  // =====================

  private initMap(): void {
    this.map = L.map('incidentMap', {
      center: [20, 0],
      zoom: 2,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    this.markersLayer = L.featureGroup().addTo(this.map);

    this.updateMapMarkers();
  }

  private updateMapMarkers(): void {
    if (!this.map || !this.markersLayer) return;

    this.markersLayer.clearLayers();

    const requestsToMap = this.getCurrentFilteredRequests();

    requestsToMap.forEach((req) => {
      const lat = (req as any).latitude;
      const lng = (req as any).longitude;

      if (lat != null && lng != null) {
        const iconHtml = `
       
       
          <div class="pulse" style="
            width: 40px;
            height: 40px;
            border-radius: 50%;
            overflow: hidden;
            border: 2px solid RED;
            box-shadow: 0 0 15px rgba(247, 11, 11, 0.3);
          ">
            <img 
              src="${req.image || 'assets/default-marker-icon.png'}" 
              alt="incident" 
              style="width: 100%; height: 100%; object-fit: cover;"
            />
          </div>
        `;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: 'custom-pulse-marker',
          iconSize: [30, 30],
          iconAnchor: [20, 40],
          popupAnchor: [0, -40],
        });

        const marker = L.marker([lat, lng], { icon: customIcon });

        marker.bindPopup(
          `<b>${req.name}</b><br/>
           Status: ${req.status}<br/>
           Event: ${req.event}<br/>
           Address: ${req.address || 'N/A'}`
        );

        this.markersLayer!.addLayer(marker);
      }
    });

    const bounds = this.markersLayer.getBounds();
    if (bounds.isValid()) {
      this.map.fitBounds(bounds, { padding: [50, 50] });
    }
  }

  // =====================
  // DATA LOADING & FILTERING
  // =====================

  private async loadRequests(): Promise<void> {
    try {
      const fetchedRequests =
        await this.emergencyRequestService.getRequestResolved();

      this.resolvedRequests = fetchedRequests.filter((r) =>
        ['resolved', 'completed'].includes(r.status?.toLowerCase() ?? '')
      );

      this.cancelledRequests = fetchedRequests.filter(
        (r) => r.status?.toLowerCase() === 'cancelled'
      );

      this.allRequests = [...this.resolvedRequests, ...this.cancelledRequests];
      this.applyFilters();
    } catch (error) {
      console.error(error);
    }
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();

    // Helper to filter by date range
    const filterByDateRange = (requests: EmergencyRequest[]) => {
      return requests.filter((req) => {
        if (!req.timestamp) return false;

        const reqDate = req.timestamp.toDate
          ? req.timestamp.toDate()
          : new Date(req.timestamp);

        if (this.filterStartDate) {
          const startDate = new Date(this.filterStartDate);
          startDate.setHours(0, 0, 0, 0);
          if (reqDate < startDate) return false;
        }

        if (this.filterEndDate) {
          const endDate = new Date(this.filterEndDate);
          endDate.setHours(23, 59, 59, 999);
          if (reqDate > endDate) return false;
        }

        return true;
      });
    };

    // Filter by search term first
    let filteredResolved = this.filterBySearch(this.resolvedRequests, term);
    let filteredCancelled = this.filterBySearch(this.cancelledRequests, term);
    let filteredAll = this.filterBySearch(this.allRequests, term);

    // Then filter by date range
    this.filteredResolvedRequests = filterByDateRange(filteredResolved);
    this.filteredCancelledRequests = filterByDateRange(filteredCancelled);
    this.filteredAllRequests = filterByDateRange(filteredAll);

    const currentFiltered = this.getCurrentFilteredRequests();

    // Update selected requests to only those still visible
    this.selectedRequests = this.selectedRequests.filter((s) =>
      currentFiltered.some((r) => r.id === s.id)
    );

    this.updateMapMarkers();
  }

  private filterBySearch(
    requests: EmergencyRequest[],
    term: string
  ): EmergencyRequest[] {
    if (!term) return requests;
    return requests.filter((req) =>
      [req.name, req.description, req.status].some((field) =>
        field?.toLowerCase().includes(term)
      )
    );
  }

  setTab(tab: 'all' | 'resolved' | 'cancelled'): void {
    this.activeTab = tab;
    this.selectedRequests = [];
    this.applyFilters();
  }

  private getCurrentFilteredRequests(): EmergencyRequest[] {
    switch (this.activeTab) {
      case 'resolved':
        return this.filteredResolvedRequests;
      case 'cancelled':
        return this.filteredCancelledRequests;
      case 'all':
      default:
        return this.filteredAllRequests;
    }
  }

  // =====================
  // SELECTION HANDLING
  // =====================

  isChecked(req: EmergencyRequest): boolean {
    return this.selectedRequests.some((s) => s.id === req.id);
  }

  setChecked(req: EmergencyRequest, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.checked && !this.isChecked(req)) {
      this.selectedRequests.push(req);
    } else if (!input.checked) {
      this.selectedRequests = this.selectedRequests.filter(
        (s) => s.id !== req.id
      );
    }
  }

  isAllSelected(): boolean {
    const current = this.getCurrentFilteredRequests();
    return current.length > 0 && current.every((r) => this.isChecked(r));
  }

  toggleSelectAllRequests(event: Event): void {
    const input = event.target as HTMLInputElement;
    const current = this.getCurrentFilteredRequests();

    if (input.checked) {
      this.selectedRequests = [
        ...this.selectedRequests,
        ...current.filter((r) => !this.isChecked(r)),
      ];
    } else {
      this.selectedRequests = this.selectedRequests.filter(
        (r) => !current.some((cr) => cr.id === r.id)
      );
    }
  }

  toggleBulkMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.showBulkMenu = !this.showBulkMenu;
  }

  selectBy(criteria: 'resolved' | 'cancelled' | 'all' | 'none'): void {
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

  // =====================
  // VIEWING / MODAL
  // =====================

  viewRequest(req: EmergencyRequest): void {
    this.requestToView = req;
  }

  viewRequestDetails(req: EmergencyRequest) {
    this.router.navigate(['/superAdmin/EmergencyRequest', req.id]);
  }

  closeView(): void {
    this.requestToView = undefined;
  }

  deleteSelectedRequests(): void {
    console.log('To delete:', this.selectedRequests);
    this.selectedRequests = [];
  }

  // =====================
  // EXPORT TO WORD
  // =====================

  private async getImageRun(imageUrl: string): Promise<ImageRun | null> {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) return null;
      const blob = await response.blob();

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const uint8Array = new Uint8Array(reader.result as ArrayBuffer);

          resolve(
            new ImageRun({
              data: uint8Array,
              transformation: { width: 100, height: 100 },
            })
          );
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });
    } catch (e) {
      return null;
    }
  }

  async exportToWord() {
    const rows = this.getCurrentFilteredRequests();
    if (rows.length === 0) return alert('No data to export!');

    // Step 1: Group by month
    const monthlyData: Record<
      string,
      { incidents: number; transfers: number; victims: number }
    > = {};

    rows.forEach((req) => {
      const date = req.timestamp?.toDate?.()
        ? req.timestamp.toDate()
        : new Date(req.timestamp);

      const month = date
        .toLocaleString('default', { month: 'long' })
        .toUpperCase();

      if (!monthlyData[month]) {
        monthlyData[month] = { incidents: 0, transfers: 0, victims: 0 };
      }

      monthlyData[month].incidents += 1;
      monthlyData[month].transfers += req.staffFullName ? 1 : 0;
      monthlyData[month].victims += req.description ? 1 : 0;
    });

    // Step 2: Build header rows (multi-level like the image)
    const tableRows: TableRow[] = [];

    // Top header row
    tableRows.push(
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            columnSpan: 2,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'NO. AND TYPE OF INCIDENT ASSISTED',
                    bold: true,
                    size: 22,
                  }),
                ],
              }),
            ],
            shading: { fill: 'D9E1F2' }, // light blue background
          }),
          new TableCell({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'PATIENT TRANSFER',
                    bold: true,
                    size: 22,
                  }),
                ],
              }),
            ],
            shading: { fill: 'D9E1F2' },
          }),
          new TableCell({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'NO. OF VICTIMS/PATIENTS TRANSFERRED TO HOSPITAL',
                    bold: true,
                    size: 22,
                  }),
                ],
              }),
            ],
            shading: { fill: 'D9E1F2' },
          }),
        ],
      })
    );

    // Step 3: Fill rows from grouped data
    let totalIncidents = 0,
      totalTransfers = 0,
      totalVictims = 0;

    Object.entries(monthlyData).forEach(([month, values]) => {
      totalIncidents += values.incidents;
      totalTransfers += values.transfers;
      totalVictims += values.victims;

      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: month, bold: true })],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: values.incidents.toString() }),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: values.transfers.toString() }),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: values.victims.toString() })],
                }),
              ],
            }),
          ],
        })
      );
    });

    // Totals row
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'TOTAL', bold: true })],
              }),
            ],
            shading: { fill: 'F2F2F2' }, // light gray
          }),
          new TableCell({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: totalIncidents.toString(), bold: true }),
                ],
              }),
            ],
            shading: { fill: 'F2F2F2' },
          }),
          new TableCell({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: totalTransfers.toString(), bold: true }),
                ],
              }),
            ],
            shading: { fill: 'F2F2F2' },
          }),
          new TableCell({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: totalVictims.toString(), bold: true }),
                ],
              }),
            ],
            shading: { fill: 'F2F2F2' },
          }),
        ],
      })
    );

    // Step 4: Create the document
    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: '24/7 Operations Center',
                  bold: true,
                  size: 32,
                }),
              ],
              spacing: { after: 200 },
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: 'Search and Rescue Operations Report',
                  bold: true,
                  size: 28,
                }),
              ],
              spacing: { after: 400 },
            }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: tableRows,
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                insideHorizontal: {
                  style: BorderStyle.SINGLE,
                  size: 1,
                  color: '000000',
                },
                insideVertical: {
                  style: BorderStyle.SINGLE,
                  size: 1,
                  color: '000000',
                },
              },
            }),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, 'rescue-operations.docx');
  }

  // =====================
  // EXPORT TO EXCEL
  // =====================

  async exportToExcel() {
    const rows = this.getCurrentFilteredRequests();
    if (rows.length === 0) return alert('No data to export!');

    const worksheetData = [
      [
        'ID',
        'Name',
        'Address',
        'Contact Number',
        'Description',
        'Email',
        'Event',
        'Status',
        'Timestamp',
      ],
    ];

    rows.forEach((req) => {
      worksheetData.push([
        req.id,
        req.name,
        req.address,
        req.contactNumber,
        req.description,
        req.email,
        req.event,
        req.status,
        req.timestamp
          ? req.timestamp.toDate?.()
            ? req.timestamp.toDate().toLocaleString()
            : new Date(req.timestamp).toLocaleString()
          : 'N/A',
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Requests');

    const wbout = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });

    saveAs(
      new Blob([wbout], { type: 'application/octet-stream' }),
      'emergency-requests.xlsx'
    );
  }

  // Pagination properties
  currentPage = 1;
  pageSize = 10; // number of items per page
  totalPages = 1;
  get pagedRequests(): EmergencyRequest[] {
    const filtered = this.getCurrentFilteredRequests();
    const start = (this.currentPage - 1) * this.pageSize;
    return filtered.slice(start, start + this.pageSize);
  }

  // Call this whenever filters or data change to recalc pages
  private updatePagination() {
    const totalItems = this.getCurrentFilteredRequests().length;
    this.totalPages = Math.ceil(totalItems / this.pageSize);
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages || 1;
    }
  }

  // Returns only the requests for current page
  get pagedFilteredRequests(): EmergencyRequest[] {
    const filtered = this.getCurrentFilteredRequests();
    const start = (this.currentPage - 1) * this.pageSize;
    return filtered.slice(start, start + this.pageSize);
  }

  // Navigation methods for pagination buttons
  goToPreviousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  goToNextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }
}
