import { LightningElement, track } from 'lwc';
import getAllLeads from '@salesforce/apex/LeadController.getAllLeads';
import syncContactsToOrgB from '@salesforce/apex/LeadController.syncContactsToOrgB';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class LeadList extends LightningElement {
    @track allLeads = [];   
    @track filteredLeads = [];
    @track displayedLeads = []; 
    @track leadSourceOptions = [];
    @track pageNumber = 1;
    @track pageSize = 10;
    @track totalPages = 0;
    @track searchKey = '';
    @track selectedSource = '';
    isSyncing = false;

    columns = [
        { label: 'Name', fieldName: 'Name', type: 'text' },
        { label: 'Company', fieldName: 'Company', type: 'text' },
        { label: 'Email', fieldName: 'Email', type: 'email' },
        { label: 'Phone', fieldName: 'Phone', type: 'phone' },
        { label: 'Lead Source', fieldName: 'LeadSource', type: 'text' },
        { label: 'Status', fieldName: 'Status', type: 'text' }
    ];

    connectedCallback() {
        this.fetchAllLeads();
    }

    fetchAllLeads() {
        getAllLeads()
            .then(result => {
                this.allLeads = result;
                this.filteredLeads = result;
                this.setLeadSourceOptions(result);
                this.calculatePagination();
                this.updateDisplayedLeads();
            })
            .catch(error => {
                console.error('Error fetching leads:', error);
            });
    }

    handleSyncClick() {
        this.isSyncing = true;
        syncContactsToOrgB()
            .then(result => {
                this.isSyncing = false;
                const status = result.status;
                if (status === 'success') {
                    this.dispatchEvent(new ShowToastEvent({
                        title: 'Sync Complete',
                        message: `${result.sent} contacts synced successfully.`,
                        variant: 'success'
                    }));
                } else {
                    this.dispatchEvent(new ShowToastEvent({
                        title: 'Sync Issues',
                        message: 'Sync completed with issues: ' + JSON.stringify(result.errorDetails || result.message),
                        variant: 'warning'
                    }));
                }
            })
            .catch(error => {
                this.isSyncing = false;
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Sync Failed',
                    message: error.body ? error.body.message : error.message,
                    variant: 'error'
                }));
            });
    }

    setLeadSourceOptions(leads) {
        const sources = [...new Set(leads.map(l => l.LeadSource).filter(Boolean))];
        this.leadSourceOptions = sources.map(src => ({
            label: src,
            value: src
        }));
    }

    calculatePagination() {
        this.totalPages = Math.ceil(this.filteredLeads.length / this.pageSize);
    }

    updateDisplayedLeads() {
        const start = (this.pageNumber - 1) * this.pageSize;
        const end = start + this.pageSize;
        this.displayedLeads = this.filteredLeads.slice(start, end);
    }

    handleSearchChange(event) {
        this.searchKey = event.target.value.toLowerCase();
        this.applyFilters();
    }

    handleSourceChange(event) {
        this.selectedSource = event.target.value;
        this.applyFilters();
    }

    applyFilters() {
        this.filteredLeads = this.allLeads.filter(lead => {
            const matchesSearch = this.searchKey
                ? (lead.Name && lead.Name.toLowerCase().includes(this.searchKey)) ||
                  (lead.Company && lead.Company.toLowerCase().includes(this.searchKey))
                : true;

            const matchesSource = this.selectedSource
                ? lead.LeadSource === this.selectedSource
                : true;

            return matchesSearch && matchesSource;
        });
        this.pageNumber = 1;
        this.calculatePagination();
        this.updateDisplayedLeads();
    }

    handlePrevious() {
        if (this.pageNumber > 1) {
            this.pageNumber--;
            this.updateDisplayedLeads();
        }
    }

    handleNext() {
        if (this.pageNumber < this.totalPages) {
            this.pageNumber++;
            this.updateDisplayedLeads();
        }
    }

    handlePageSizeChange(event) {
        this.pageSize = parseInt(event.target.value, 10);
        this.pageNumber = 1;
        this.calculatePagination();
        this.updateDisplayedLeads();
    }
}
