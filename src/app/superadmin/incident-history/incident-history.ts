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

  // HOVER REQUEST ON MAP

  onRequestHover(req: EmergencyRequest) {
    if (!this.map) return;

    // Remove previous hover marker
    if (this.hoverMarker) {
      this.map.removeLayer(this.hoverMarker);
    }

    // Only add marker if valid coords
    if (req.latitude != null && req.longitude != null) {
      // Create a custom DivIcon with circular image
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
        className: '', // Remove default styles
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

      // Center map on hovered marker smoothly
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
      center: [20, 0], // default center, adjust as needed
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
          <div style="
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
          className: '',
          iconSize: [40, 40],
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

    // Adjust map view to fit markers
    const bounds = this.markersLayer.getBounds();
    if (bounds.isValid()) {
      this.map.fitBounds(bounds, { padding: [50, 50] });
    }
  }

  // =====================
  // DATA LOADING & FILTER
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
    } catch (error) {}
  }

  applyFilters(): void {
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

    const currentFiltered = this.getCurrentFilteredRequests();

    // Keep only selected requests that are still visible after filtering
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
    // Implement actual deletion logic here if needed
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
          const type: 'jpg' | 'png' =
            imageUrl.toLowerCase().endsWith('.jpg') ||
            imageUrl.toLowerCase().endsWith('.jpeg')
              ? 'jpg'
              : 'png';

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

    const headers = [
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
    ];
    const tableRows: TableRow[] = [
      new TableRow({
        children: headers.map(
          (header) =>
            new TableCell({
              width: { size: 1000, type: WidthType.DXA },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: header, bold: true })],
                }),
              ],
            })
        ),
      }),
    ];

    for (const req of rows) {
      const imageParagraph = req.image
        ? await this.getImageRun(req.image)
        : null;
      const imageCell = new TableCell({
        children: imageParagraph
          ? [new Paragraph({ children: [imageParagraph] })]
          : [new Paragraph('No Image')],
        verticalAlign: VerticalAlign.CENTER,

        width: { size: 1200, type: WidthType.DXA },
      });

      const rowCells = [
        req.id,
        req.name,
        req.address,
        req.contactNumber,
        req.description,
        req.email,
        req.event,
        '', // Image placeholder
        req.status,
        req.timestamp
          ? req.timestamp.toDate?.()
            ? req.timestamp.toDate().toLocaleString()
            : new Date(req.timestamp).toLocaleString()
          : '',
      ].map((val, i) =>
        i === 7
          ? imageCell
          : new TableCell({ children: [new Paragraph(String(val ?? ''))] })
      );

      tableRows.push(new TableRow({ children: rowCells }));
    }

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: 'Emergency Requests Report',
              heading: HeadingLevel.HEADING_1,
            }),
            new Table({ rows: tableRows }),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, 'emergency_requests_report.docx');
  }

  exportToExcel() {
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
    const blob = new Blob([wbout], { type: 'application/octet-stream' });

    saveAs(blob, 'emergency_requests_report.xlsx');
  }
}
