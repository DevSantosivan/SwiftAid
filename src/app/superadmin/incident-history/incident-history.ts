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
            border: 2px solid rgba(11, 247, 43, 0.3);
            box-shadow: 0 0 15px rgba(11, 247, 43, 0.3);
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

  async exportToWord() {
    const rows = this.getCurrentFilteredRequests();
    if (rows.length === 0) return alert('No data to export!');

    // Sub-types for vehicular accident only
    const accidentTypes = [
      'Self Accident',
      'Collision',
      'Sideswipe',
      'Stray Animals',
      'Pedestrian Accident',
    ];

    // Months
    const months = [
      'JANUARY',
      'FEBRUARY',
      'MARCH',
      'APRIL',
      'MAY',
      'JUNE',
      'JULY',
      'AUGUST',
      'SEPTEMBER',
      'OCTOBER',
      'NOVEMBER',
      'DECEMBER',
    ];

    // Collect all unique event categories (other than "Vehicular" and accidentTypes)
    const allEvents = Array.from(
      new Set(
        rows
          .map((r) => r.event)
          .filter((ev) => ev !== 'Vehicular' && !accidentTypes.includes(ev))
      )
    );

    // Group by month
    const grouped = months.map((month, idx) => {
      const monthEvents = rows.filter((r) => {
        const d = r.timestamp?.toDate?.()
          ? r.timestamp.toDate()
          : new Date(r.timestamp);
        return d.getMonth() === idx;
      });

      // Vehicular events only
      const vehicularEvents = monthEvents.filter(
        (r) => r.event === 'Vehicular'
      );

      // Count vehicular subtypes by eventType
      const typeCounts: Record<string, number> = {};
      accidentTypes.forEach((type) => {
        typeCounts[type] = vehicularEvents.filter(
          (r) => r.eventType === type
        ).length;
      });

      // Count other events (non-vehicular)
      const otherCounts: Record<string, number> = {};
      allEvents.forEach((ev) => {
        otherCounts[ev] = monthEvents.filter((r) => r.event === ev).length;
      });

      // Total vehicle accidents = count of all vehicular events
      const totalVehicle = vehicularEvents.length;

      const male = monthEvents.filter((r) => r.sex === 'Male').length;
      const female = monthEvents.filter((r) => r.sex === 'Female').length;
      const patients = male + female;

      return {
        month,
        totalVehicle,
        typeCounts,
        otherCounts,
        male,
        female,
        patients,
      };
    });

    // Compute totals
    const totals = {
      totalVehicle: grouped.reduce((a, b) => a + b.totalVehicle, 0),
      typeCounts: {} as Record<string, number>,
      otherCounts: {} as Record<string, number>,
      male: grouped.reduce((a, b) => a + b.male, 0),
      female: grouped.reduce((a, b) => a + b.female, 0),
      patients: grouped.reduce((a, b) => a + b.patients, 0),
    };
    accidentTypes.forEach((type) => {
      totals.typeCounts[type] = grouped.reduce(
        (a, b) => a + b.typeCounts[type],
        0
      );
    });
    allEvents.forEach((ev) => {
      totals.otherCounts[ev] = grouped.reduce(
        (a, b) => a + b.otherCounts[ev],
        0
      );
    });

    // ========== TABLE HEADER ==========
    const header1Cells = [
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: 'MONTH', bold: true })],
            alignment: AlignmentType.CENTER,
          }),
        ],
        rowSpan: 2,
      }),
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: 'TOTAL NO. OF VEHICULAR ACCIDENT',
                bold: true,
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
        rowSpan: 2,
      }),
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: 'TYPE OF VEHICULAR ACCIDENT', bold: true }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
        columnSpan: accidentTypes.length,
      }),
      ...allEvents.map(
        (ev) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `TOTAL NO. OF ${ev.toUpperCase()}`,
                    bold: true,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            rowSpan: 2,
          })
      ),
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: 'NO. OF MALE', bold: true })],
            alignment: AlignmentType.CENTER,
          }),
        ],
        rowSpan: 2,
      }),
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: 'NO. OF FEMALE', bold: true })],
            alignment: AlignmentType.CENTER,
          }),
        ],
        rowSpan: 2,
      }),
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: 'TOTAL NO. OF PATIENT', bold: true }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
        rowSpan: 2,
      }),
    ];

    const header1 = new TableRow({ children: header1Cells });

    const header2 = new TableRow({
      children: accidentTypes.map(
        (type) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: type, bold: true })],
                alignment: AlignmentType.CENTER,
              }),
            ],
          })
      ),
    });

    // ========== DATA ROWS ==========
    const dataRows = grouped.map(
      (g) =>
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  text: g.month,
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  text: g.totalVehicle.toString(),
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
            ...accidentTypes.map(
              (type) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      text: g.typeCounts[type].toString(),
                      alignment: AlignmentType.CENTER,
                    }),
                  ],
                })
            ),
            ...allEvents.map(
              (ev) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      text: g.otherCounts[ev].toString(),
                      alignment: AlignmentType.CENTER,
                    }),
                  ],
                })
            ),
            new TableCell({
              children: [
                new Paragraph({
                  text: g.male.toString(),
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  text: g.female.toString(),
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  text: g.patients.toString(),
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
          ],
        })
    );

    // ========== TOTAL ROW ==========
    const totalRow = new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: 'TOTAL',
                  bold: true,
                  color: 'FF0000', // red text
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: totals.totalVehicle.toString(),
                  bold: true,
                  color: 'FF0000', // red text
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
        ...accidentTypes.map(
          (type) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: totals.typeCounts[type].toString(),
                      bold: true,
                      color: 'FF0000', // red text
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            })
        ),
        ...allEvents.map(
          (ev) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: totals.otherCounts[ev].toString(),
                      bold: true,
                      color: 'FF0000', // red text
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            })
        ),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: totals.male.toString(),
                  bold: true,
                  color: 'FF0000', // red text
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: totals.female.toString(),
                  bold: true,
                  color: 'FF0000', // red text
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: totals.patients.toString(),
                  bold: true,
                  color: 'FF0000', // red text
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
      ],
    });

    // ========== DOC CREATION ==========
    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: `24/7 SEARCH AND RESCUE OPERATIONS ANNUAL REPORT ${new Date().getFullYear()}`,
                  bold: true,
                  size: 32,
                }),
              ],
              spacing: { after: 400 },
            }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [header1, header2, ...dataRows, totalRow],
            }),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, 'accident-report.docx');
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
