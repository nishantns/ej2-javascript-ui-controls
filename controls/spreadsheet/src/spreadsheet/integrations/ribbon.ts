import { Ribbon as RibbonComponent, RibbonItemModel, ExpandCollapseEventArgs } from '../../ribbon/index';
import { Spreadsheet } from '../base/index';
import { ribbon, MenuSelectArgs, selectionComplete, beforeRibbonCreate, dialog, reapplyFilter, enableFileMenuItems } from '../common/index';
import { IRenderer, destroyComponent, performUndoRedo, beginAction, completeAction, applySort, hideRibbonTabs } from '../common/index';
import { enableRibbonItems, ribbonClick, paste, locale, refreshSheetTabs, initiateCustomSort, getFilteredColumn } from '../common/index';
import { tabSwitch, getUpdateUsingRaf, enableToolbar, updateToggleItem, initiateHyperlink, editHyperlink } from '../common/index';
import { addRibbonTabs, addToolbarItems } from '../common/index';
import { MenuEventArgs, BeforeOpenCloseMenuEventArgs, ClickEventArgs, Toolbar, Menu, MenuItemModel } from '@syncfusion/ej2-navigations';
import { SelectingEventArgs } from '@syncfusion/ej2-navigations';
import { extend, L10n, isNullOrUndefined, getComponent, closest, detach, selectAll, select } from '@syncfusion/ej2-base';
import { SheetModel, getCellIndexes, CellModel, getFormatFromType, getTypeFromFormat } from '../../workbook/index';
import { DropDownButton, OpenCloseMenuEventArgs, SplitButton, ItemModel } from '@syncfusion/ej2-splitbuttons';
import { calculatePosition, OffsetPosition } from '@syncfusion/ej2-popups';
import { applyNumberFormatting, getFormattedCellObject, getRangeIndexes } from '../../workbook/common/index';
import { activeCellChanged, textDecorationUpdate, BeforeCellFormatArgs } from '../../workbook/common/index';
import { sheetsDestroyed, SortOrder, NumberFormatType, SetCellFormatArgs } from '../../workbook/common/index';
import { getCell, FontFamily, VerticalAlign, TextAlign, CellStyleModel, setCellFormat } from '../../workbook/index';
import { Button } from '@syncfusion/ej2-buttons';
import { ColorPicker } from './color-picker';
import { Dialog } from '../services';

/**
 * Represents Ribbon for Spreadsheet.
 */
export class Ribbon {
    private parent: Spreadsheet;
    private ribbon: RibbonComponent;
    private numFormatDDB: DropDownButton;
    private fontSizeDdb: DropDownButton;
    private fontNameDdb: DropDownButton;
    private textAlignDdb: DropDownButton;
    private verticalAlignDdb: DropDownButton;
    private sortingDdb: DropDownButton;
    private fontNameIndex: number = 5;
    private numPopupWidth: number = 0;
    constructor(parent: Spreadsheet) {
        this.parent = parent;
        this.addEventListener();
        new ColorPicker(parent);
    }
    public getModuleName(): string {
        return 'ribbon';
    }
    private initRibbon(args: { uiUpdate?: boolean }): void {
        if (!this.parent.showRibbon && this.ribbon) {
            this.destroy(); return;
        }
        this.parent.notify(beforeRibbonCreate, {});
        if (this.parent.isMobileView()) {
            this.createMobileView();
        } else {
            this.createRibbon(args);
        }
    }
    private getRibbonMenuItems(): MenuItemModel[] {
        let l10n: L10n = this.parent.serviceLocator.getService(locale);
        return [{
                    text: this.parent.isMobileView() ? '' : l10n.getConstant('File'),
                    iconCss: this.parent.isMobileView() ? 'e-icons e-file-menu-icon' : null,
                    items: [
                        { text: l10n.getConstant('New'), id: 'New', iconCss: 'e-new e-icons' },
                        { text: l10n.getConstant('Open'), id: 'Open', iconCss: 'e-open e-icons' },
                        {
                            text: l10n.getConstant('SaveAs'),
                            iconCss: 'e-save e-icons',
                            items: [
                                { text: l10n.getConstant('ExcelXlsx'), id: 'Xlsx', iconCss: 'e-xlsx e-icons' },
                                { text: l10n.getConstant('ExcelXls'), id: 'Xls', iconCss: 'e-xls e-icons' },
                                { text: l10n.getConstant('CSV'), id: 'Csv', iconCss: 'e-csv e-icons' }
                            ]
                        }]
                }];
    }
    private getRibbonItems(): RibbonItemModel[] {
        let id: string = this.parent.element.id;
        let l10n: L10n = this.parent.serviceLocator.getService(locale);
        let items: RibbonItemModel[] = [
            {
                header: { text: l10n.getConstant('Home') },
                content: [
                    { prefixIcon: 'e-undo-icon', tooltipText: `${l10n.getConstant('Undo')} (Ctrl+Z)`, id: id + '_undo' },
                    { prefixIcon: 'e-redo-icon', tooltipText: `${l10n.getConstant('Redo')} (Ctrl+Y)`, id: id + '_redo' },
                    { type: 'Separator' },
                    { prefixIcon: 'e-cut-icon', tooltipText: `${l10n.getConstant('Cut')} (Ctrl+X)`, id: id + '_cut' },
                    { prefixIcon: 'e-copy-icon', tooltipText: `${l10n.getConstant('Copy')} (Ctrl+C)`, id: id + '_copy' },
                    { tooltipText: `${l10n.getConstant('Paste')} (Ctrl+V)`, template: this.getPasteBtn(id) },
                    { type: 'Separator' },
                    { template: this.getNumFormatDDB(id), tooltipText: l10n.getConstant('NumberFormat') }, { type: 'Separator' },
                    { template: this.getFontNameDDB(id), tooltipText: l10n.getConstant('Font') }, { type: 'Separator' },
                    { template: this.getFontSizeDDB(id), tooltipText: l10n.getConstant('FontSize') }, { type: 'Separator' },
                    { template: this.getBtn(id, 'bold'), tooltipText: `${l10n.getConstant('Bold')} (Ctrl+B)` },
                    { template: this.getBtn(id, 'italic'), tooltipText: `${l10n.getConstant('Italic')} (Ctrl+I)` },
                    { template: this.getBtn(id, 'line-through'), tooltipText: `${l10n.getConstant('Strikethrough')} (Ctrl+5)` },
                    { template: this.getBtn(id, 'underline'), tooltipText: `${l10n.getConstant('Underline')} (Ctrl+U)` },
                    { template: document.getElementById(`${id}_font_color_picker`), tooltipText: l10n.getConstant('TextColor') },
                    { type: 'Separator' },
                    { template: document.getElementById(`${id}_fill_color_picker`), tooltipText: l10n.getConstant('FillColor') },
                    { type: 'Separator' }, { template: this.getTextAlignDDB(id), tooltipText: l10n.getConstant('HorizontalAlignment') },
                    { template: this.getVerticalAlignDDB(id), tooltipText: l10n.getConstant('VerticalAlignment') }]
            },
            {
                header: { text: l10n.getConstant('Insert') },
                content: [{
                    prefixIcon: 'e-hyperlink-icon', text: l10n.getConstant('Link'),
                    id: id + '_hyperlink', click: (): void => { this.getHyperlinkDlg(); }
                }]
            },
            {
                header: { text: l10n.getConstant('Formulas') },
                content: [{ prefixIcon: 'e-insert-function', text: l10n.getConstant('InsertFunction'), id: id + '_insert_function' }]
            },
            {
                header: { text: l10n.getConstant('View') },
                content: [
                    { prefixIcon: 'e-hide-headers', text: this.getLocaleText('Headers'), id: id + '_headers' }, { type: 'Separator' },
                    { prefixIcon: 'e-hide-gridlines', text: this.getLocaleText('GridLines'), id: id + '_gridlines' }]
            }];
        if (this.parent.allowSorting || this.parent.allowFiltering) {
            items.find((x: RibbonItemModel) => x.header && x.header.text === l10n.getConstant('Home')).content.push(
                { type: 'Separator' },
                {
                    template: this.getSortFilterDDB(id), tooltipText: l10n.getConstant('SortAndFilter')
                });
        }
        return items;
    }

    private getPasteBtn(id: string): Element {
        let btn: HTMLElement = this.parent.element.appendChild(
            this.parent.createElement('button', { id: id + '_paste' }));
        let l10n: L10n = this.parent.serviceLocator.getService(locale);
        let pasteSplitBtn: SplitButton = new SplitButton(
            {
                iconCss: 'e-icons e-paste-icon',
                items: [
                    { text: l10n.getConstant('All'), id: 'All' },
                    { text: l10n.getConstant('Values'), id: 'Values' },
                    { text: l10n.getConstant('Formats'), id: 'Formats' }],
                select: (args: MenuEventArgs) => {
                    this.parent.notify(paste, { type: args.item.id, isAction: true });
                },
                click: () => {
                    this.parent.notify(paste, { isAction: true });
                },
                close: () => { this.parent.element.focus(); }
            });
        pasteSplitBtn.createElement = this.parent.createElement;
        pasteSplitBtn.appendTo(btn);
        return btn.parentElement;
    }

    private getHyperlinkDlg(): void {
        let indexes: number[] = getRangeIndexes(this.parent.getActiveSheet().activeCell);
        let cell: CellModel = this.parent.sheets[this.parent.getActiveSheet().id - 1].rows[indexes[0]].cells[indexes[1]];
        if (cell && cell.hyperlink) {
            this.parent.notify(editHyperlink, null);
        } else {
            this.parent.notify(initiateHyperlink, null);
        }
    }

    private getLocaleText(str: string, setClass?: boolean): string {
        let text: string; let l10n: L10n = this.parent.serviceLocator.getService(locale);
        let sheet: SheetModel = this.parent.getActiveSheet();
        if (sheet['show' + str]) {
            if (setClass) { this.parent.getMainContent().classList.remove('e-hide-' + str.toLowerCase()); }
            text = l10n.getConstant('Hide' + str);
        } else {
            if (setClass) { this.parent.getMainContent().classList.add('e-hide-' + str.toLowerCase()); }
            text = l10n.getConstant('Show' + str);
        }
        return text;
    }
    private createRibbon(args: { uiUpdate?: boolean }): void {
        let ribbonElement: HTMLElement = this.parent.createElement('div');
        this.ribbon = new RibbonComponent({
            selectedTab: 0,
            menuItems: this.getRibbonMenuItems(),
            items: this.getRibbonItems(),
            fileItemSelect: this.fileItemSelect.bind(this),
            beforeOpen: this.fileMenuBeforeOpen.bind(this),
            beforeClose: this.fileMenuBeforeClose.bind(this),
            clicked: this.toolbarClicked.bind(this),
            created: this.ribbonCreated.bind(this),
            selecting: this.tabSelecting.bind(this),
            expandCollapse: this.expandCollapseHandler.bind(this),
            beforeFileItemRender: this.beforeRenderHandler.bind(this)
        });
        this.ribbon.createElement = this.parent.createElement;
        if (args && args.uiUpdate) {
            let refEle: Element = this.parent.element.querySelector('.e-formula-bar-panel') ||
                document.getElementById(this.parent.element.id + '_sheet_panel');
            this.parent.element.insertBefore(ribbonElement, refEle);
        } else {
            this.parent.element.appendChild(ribbonElement);
        }
        this.ribbon.appendTo(ribbonElement);
    }
    private tabSelecting(args: SelectingEventArgs): void {
        if (args.selectingIndex !== this.ribbon.selectedTab) {
            this.refreshRibbonContent(args.selectingIndex);
            this.parent.notify(tabSwitch, { activeTab: args.selectingIndex });
        }
    }

    private beforeRenderHandler(args: MenuEventArgs): void {
        let l10n: L10n = this.parent.serviceLocator.getService(locale);
        if (args.item.text === l10n.getConstant('Open') && (!this.parent.openUrl || !this.parent.allowOpen)) {
            args.element.classList.add('e-disabled');
        }
        if (args.item.text === l10n.getConstant('SaveAs') && (!this.parent.saveUrl || !this.parent.allowSave)) {
            args.element.classList.add('e-disabled');
        }
    }

    private getNumFormatDDB(id: string): Element {
        let numFormatBtn: HTMLElement = this.parent.createElement('button', { id: id + '_number_format' });
        numFormatBtn.appendChild(this.parent.createElement('span', { className: 'e-tbar-btn-text', innerHTML: 'General' }));
        this.numFormatDDB = new DropDownButton({
            items: this.getNumFormatDdbItems(id),
            content: '',
            select: (args: MenuEventArgs): void => this.numDDBSelect(args),
            open: (args: OpenCloseMenuEventArgs): void => this.numDDBOpen(args),
            beforeItemRender: (args: MenuEventArgs): void => this.previewNumFormat(args),
            close: (): void => this.parent.element.focus(),
            cssClass: 'e-flat e-numformat-ddb',
            beforeOpen: this.tBarDdbBeforeOpen.bind(this)
        });
        this.numFormatDDB.createElement = this.parent.createElement;
        this.numFormatDDB.appendTo(numFormatBtn);
        return numFormatBtn;
    }

    private getFontSizeDDB(id: string): Element {
        this.fontSizeDdb = new DropDownButton({
            cssClass: 'e-font-size-ddb',
            content: '11',
            items: [{ text: '8' }, { text: '9' }, { text: '10' }, { text: '11' }, { text: '12' }, { text: '14' }, { text: '16' },
            { text: '18' }, { text: '20' }, { text: '22' }, { text: '24' }, { text: '26' }, { text: '28' }, { text: '36' },
            { text: '48' }, { text: '72' }],
            beforeOpen: (args: BeforeOpenCloseMenuEventArgs): void => {
                this.tBarDdbBeforeOpen(args);
                this.refreshSelected(this.fontSizeDdb, args.element, 'content', 'text');
            },
            select: (args: MenuEventArgs): void => {
                let eventArgs: SetCellFormatArgs = { style: { fontSize: `${args.item.text}pt` }, onActionUpdate: true };
                this.parent.notify(setCellFormat, eventArgs);
                if (!eventArgs.cancel) { this.fontSizeDdb.content = eventArgs.style.fontSize.split('pt')[0]; this.fontSizeDdb.dataBind(); }
            },
            close: (): void => this.parent.element.focus()
        });
        this.fontSizeDdb.createElement = this.parent.createElement;
        this.fontSizeDdb.appendTo(this.parent.createElement('button', { id: id + '_font_size' }));
        return this.fontSizeDdb.element;
    }

    private getFontNameDDB(id: string): Element {
        let fontNameBtn: HTMLElement = this.parent.createElement('button', { id: id + '_font_name' });
        fontNameBtn.appendChild(this.parent.createElement('span', { className: 'e-tbar-btn-text', innerHTML: 'Calibri' }));
        this.fontNameDdb = new DropDownButton({
            cssClass: 'e-font-family',
            items: this.getFontFamilyItems(),
            select: (args: MenuEventArgs): void => {
                let eventArgs: SetCellFormatArgs = { style: { fontFamily: args.item.text as FontFamily }, onActionUpdate: true };
                this.parent.notify(setCellFormat, eventArgs);
                if (!eventArgs.cancel) { this.refreshFontNameSelection(eventArgs.style.fontFamily); }
            },
            close: (): void => this.parent.element.focus(),
            beforeOpen: this.tBarDdbBeforeOpen.bind(this)
        });
        this.fontNameDdb.createElement = this.parent.createElement;
        this.fontNameDdb.appendTo(fontNameBtn);
        return fontNameBtn;
    }

    private getBtn(id: string, name: string): Element {
        let btnObj: Button = new Button({ iconCss: `e-icons e-${name}-icon`, isToggle: true });
        btnObj.createElement = this.parent.createElement;
        btnObj.appendTo(this.parent.createElement('button', { id: `${id}_${name}` }));
        btnObj.element.addEventListener('click', this.toggleBtnClicked.bind(this));
        return btnObj.element;
    }

    private getTextAlignDDB(id: string): Element {
        this.textAlignDdb = new DropDownButton({
            cssClass: 'e-align-ddb',
            iconCss: 'e-icons e-left-icon',
            items: [{ iconCss: 'e-icons e-left-icon' }, { iconCss: 'e-icons e-center-icon' }, { iconCss: 'e-icons e-right-icon' }],
            beforeItemRender: this.alignItemRender.bind(this),
            beforeOpen: (args: BeforeOpenCloseMenuEventArgs): void => {
                this.refreshSelected(this.textAlignDdb, args.element, 'iconCss');
            },
            select: (args: MenuEventArgs): void => {
                let eventArgs: SetCellFormatArgs = {
                    style: { textAlign: args.item.iconCss.split(' e-')[1].split('-icon')[0] as TextAlign }, onActionUpdate: true
                };
                this.parent.notify(setCellFormat, eventArgs);
                if (!eventArgs.cancel) {
                    this.textAlignDdb.iconCss = `e-icons e-${eventArgs.style.textAlign}-icon`; this.textAlignDdb.dataBind();
                }
            },
            close: (): void => this.parent.element.focus()
        });
        this.textAlignDdb.createElement = this.parent.createElement;
        this.textAlignDdb.appendTo(this.parent.createElement('button', { id: id + '_text_align' }));
        return this.textAlignDdb.element;
    }

    private getVerticalAlignDDB(id: string): Element {
        this.verticalAlignDdb = new DropDownButton({
            cssClass: 'e-align-ddb',
            iconCss: 'e-icons e-bottom-icon',
            items: [{ iconCss: 'e-icons e-top-icon' }, { iconCss: 'e-icons e-middle-icon' }, { iconCss: 'e-icons e-bottom-icon' }],
            beforeItemRender: this.alignItemRender.bind(this),
            beforeOpen: (args: BeforeOpenCloseMenuEventArgs): void => {
                this.refreshSelected(this.verticalAlignDdb, args.element, 'iconCss');
            },
            select: (args: MenuEventArgs): void => {
                let eventArgs: SetCellFormatArgs = {
                    style: { verticalAlign: args.item.iconCss.split(' e-')[1].split('-icon')[0] as VerticalAlign }, onActionUpdate: true
                };
                this.parent.notify(setCellFormat, eventArgs);
                if (!eventArgs.cancel) {
                    this.verticalAlignDdb.iconCss = `e-icons e-${eventArgs.style.verticalAlign}-icon`; this.verticalAlignDdb.dataBind();
                }
            },
            close: (): void => this.parent.element.focus()
        });
        this.verticalAlignDdb.createElement = this.parent.createElement;
        this.verticalAlignDdb.appendTo(this.parent.createElement('button', { id: id + '_vertical_align' }));
        return this.verticalAlignDdb.element;
    }

    private getSortFilterDDB(id: string): Element {
        let l10n: L10n = this.parent.serviceLocator.getService(locale);
        this.sortingDdb = new DropDownButton({
            cssClass: 'e-sort-filter-ddb',
            iconCss: 'e-icons e-sort-filter-icon',
            items: [
                { text: l10n.getConstant('SortAscending'), iconCss: 'e-icons e-sort-asc' },
                { text: l10n.getConstant('SortDescending'), iconCss: 'e-icons e-sort-desc' },
                { text: l10n.getConstant('CustomSort') + '...', iconCss: 'e-icons e-sort-custom' },
                { separator: true },
                { text: l10n.getConstant('Filter'), iconCss: 'e-icons e-filter-apply', id: id + '_applyfilter' },
                { text: l10n.getConstant('ClearAllFilter'), iconCss: 'e-icons e-filter-clear', id: id + '_clearfilter' },
                { text: l10n.getConstant('ReapplyFilter'), iconCss: 'e-icons e-filter-reapply', id: id + '_reapplyfilter' }],
            beforeItemRender: (args: MenuEventArgs): void => {
                let eventArgs: { [key: string]: boolean } = { isFiltered: false, isClearAll: true };
                this.parent.notify(getFilteredColumn, eventArgs);
                if (args.item.id === id + '_clearfilter' || args.item.id === id + '_reapplyfilter') {
                    if (!eventArgs.isFiltered) {
                        args.element.classList.add('e-disabled');
                    } else {
                        args.element.classList.remove('e-disabled');
                    }
                }
            },
            beforeOpen: (args: BeforeOpenCloseMenuEventArgs): void => {
                this.refreshSelected(this.sortingDdb, args.element, 'iconCss');
            },
            select: (args: MenuEventArgs): void => {
                switch (args.item.text) {
                    case l10n.getConstant('Filter'):
                    this.parent.applyFilter();
                        break;
                    case l10n.getConstant('ClearAllFilter'):
                        this.parent.clearFilter();
                        break;
                    case l10n.getConstant('ReapplyFilter'):
                        this.parent.notify(reapplyFilter, null);
                        break;
                    case l10n.getConstant('CustomSort') + '...':
                        this.parent.notify(initiateCustomSort, null);
                        break;
                    default:
                        let direction: SortOrder = args.item.text === l10n.getConstant('SortAscending') ? 'Ascending' : 'Descending';
                    this.parent.notify(applySort, { sortOptions: { sortDescriptors: { order: direction } } });
                        break;
                }
            },
            close: (): void => this.parent.element.focus()
        });
        this.sortingDdb.createElement = this.parent.createElement;
        this.sortingDdb.appendTo(this.parent.createElement('button', { id: id + '_sorting' }));
        return this.sortingDdb.element;
    }

    private ribbonCreated(): void {
        if (this.parent.enableClipboard) { this.enableRibbonItems([{ id: this.parent.element.id + '_paste', isEnable: false }]); }
        if (this.parent.allowUndoRedo) {
            this.enableRibbonItems([{ id: this.parent.element.id + '_undo', isEnable: false },
            { id: this.parent.element.id + '_redo', isEnable: false }]);
        }
        (this.ribbon.element.querySelector('.e-drop-icon') as HTMLElement).title
            = (this.parent.serviceLocator.getService(locale) as L10n).getConstant('CollapseToolbar');
    }

    private alignItemRender(args: MenuEventArgs): void {
        let text: string = args.item.iconCss.split(' e-')[1].split('-icon')[0];
        text = text[0].toUpperCase() + text.slice(1, text.length);
        args.element.title = (this.parent.serviceLocator.getService(locale) as L10n).getConstant('Align' + text);
    }
    private toggleBtnClicked(e: MouseEvent | KeyboardEvent): void {
        let target: Element = closest(e.target as Element, '.e-btn');
        let parentId: string = this.parent.element.id; let id: string = target.id;
        let property: string = setCellFormat; let value: string;
        let defaultModel: CellStyleModel; let activeModel: CellStyleModel; let eventArgs: SetCellFormatArgs; let key: string;
        switch (id) {
            case `${parentId}_bold`:
                defaultModel = { fontWeight: 'normal' }; activeModel = { fontWeight: 'bold' }; key = 'fontWeight';
                break;
            case `${parentId}_italic`:
                defaultModel = { fontStyle: 'normal' }; activeModel = { fontStyle: 'italic' }; key = 'fontStyle';
                break;
            case `${parentId}_line-through`:
                property = textDecorationUpdate; defaultModel = { textDecoration: 'line-through' }; activeModel = defaultModel;
                key = 'textDecoration';
                break;
            case `${parentId}_underline`:
                property = textDecorationUpdate; defaultModel = { textDecoration: 'underline' }; activeModel = defaultModel;
                key = 'textDecoration';
                break;
        }
        if (target.classList.contains('e-active')) {
            value = activeModel[key];
            eventArgs = { style: activeModel, onActionUpdate: true };
            this.parent.notify(property, eventArgs);
            if (eventArgs.cancel) { target.classList.remove('e-active'); }
        } else {
            value = defaultModel[key];
            eventArgs = { style: defaultModel, onActionUpdate: true };
            this.parent.notify(property, eventArgs);
            if (eventArgs.cancel) { target.classList.add('e-active'); }
        }
        if (!eventArgs.cancel && value !== eventArgs.style[key]) {
            this.refreshToggleBtn(getCellIndexes(this.parent.getActiveSheet().activeCell));
        }
        this.parent.element.focus();
    }
    private getCellStyleValue(cssProp: string, indexes: number[]): string {
        let cell: CellModel = getCell(indexes[0], indexes[1], this.parent.getActiveSheet());
        let value: string = this.parent.cellStyle[cssProp];
        if (cell && cell.style && cell.style[cssProp]) {
            value = cell.style[cssProp];
        }
        return value;
    }
    private refreshSelected(inst: DropDownButton, element: HTMLElement, key: string, itemKey: string = key): void {
        for (let i: number = 0; i < inst.items.length; i++) {
            if (inst.items[i][itemKey] === inst[key]) {
                element.children[i].classList.add('e-selected'); break;
            }
        }
    }
    private expandCollapseHandler(args: ExpandCollapseEventArgs): void {
        let target: HTMLElement = this.ribbon.element.querySelector('.e-drop-icon') as HTMLElement;
        let l10n: L10n = this.parent.serviceLocator.getService(locale);
        if (args.expanded) {
            target.title = l10n.getConstant('CollapseToolbar');
        } else {
            target.title = l10n.getConstant('ExpandToolbar');
        }
        this.parent.setPanelSize();
    }
    private getNumFormatDdbItems(id: string): ItemModel[] {
        let l10n: L10n = this.parent.serviceLocator.getService(locale);
        return [
            { id: id + 'item1', text: l10n.getConstant('General') },
            { id: id + 'item2', text: l10n.getConstant('Number') },
            { id: id + 'item3', text: l10n.getConstant('Currency') },
            { id: id + 'item4', text: l10n.getConstant('Accounting') },
            { id: id + 'item5', text: l10n.getConstant('ShortDate') },
            { id: id + 'item6', text: l10n.getConstant('LongDate') },
            { id: id + 'item7', text: l10n.getConstant('Time') },
            { id: id + 'item8', text: l10n.getConstant('Percentage') },
            { id: id + 'item9', text: l10n.getConstant('Fraction') },
            { id: id + 'item10', text: l10n.getConstant('Scientific') },
            { id: id + 'item11', text: l10n.getConstant('Text') }
        ];
    }
    private getFontFamilyItems(): ItemModel[] {
        return [{ text: 'Arial' }, { text: 'Arial Black' }, { text: 'Axettac Demo' }, { text: 'Batang' }, { text: 'Book Antiqua' },
        { text: 'Calibri', iconCss: 'e-icons e-selected-icon' }, { text: 'Courier' }, { text: 'Courier New' },
        { text: 'Din Condensed' }, { text: 'Georgia' }, { text: 'Helvetica' }, { text: 'Helvetica New' }, { text: 'Roboto' },
        { text: 'Tahoma' }, { text: 'Times New Roman' }, { text: 'Verdana' }];
    }

    private enableToolbar(args: { enable: boolean }): void {
        this.ribbon.enableItems(args.enable);
    }

    private numDDBSelect(args: MenuEventArgs): void {
        let eventArgs: { format: string, range: string, cancel: boolean, requestType: string } = {
            format: getFormatFromType(args.item.text as NumberFormatType),
            range: this.parent.getActiveSheet().selectedRange, cancel: false, requestType: 'NumberFormat'
        };
        let actionArgs: BeforeCellFormatArgs = {
            range: this.parent.getActiveSheet().name + '!' + eventArgs.range,
            format: <string>eventArgs.format, requestType: 'NumberFormat'
        };
        this.parent.trigger('beforeCellFormat', eventArgs);
        this.parent.notify(beginAction, { eventArgs: eventArgs, action: 'format' });
        if (eventArgs.cancel) {
            return;
        }
        this.parent.notify(applyNumberFormatting, eventArgs);
        this.parent.notify(selectionComplete, <MouseEvent>{ type: 'mousedown' });
        this.refreshNumFormatSelection(args.item.text);
        this.parent.notify(completeAction, { eventArgs: actionArgs, action: 'format' });
    }

    private tBarDdbBeforeOpen(args: BeforeOpenCloseMenuEventArgs): void {
        let viewportHeight: number = this.parent.viewport.height;
        let actualHeight: number = (parseInt(getComputedStyle(args.element.firstElementChild).height, 10) * args.items.length) +
            (parseInt(getComputedStyle(args.element).paddingTop, 10) * 2);
        if (actualHeight > viewportHeight) {
            args.element.style.height = `${viewportHeight}px`; args.element.style.overflowY = 'auto';
        }
    }

    private numDDBOpen(args: OpenCloseMenuEventArgs): void {
        this.numPopupWidth = 0;
        let elemList: NodeListOf<Element> = args.element.querySelectorAll('span.e-numformat-preview-text');
        for (let i: number = 0, len: number = elemList.length; i < len; i++) {
            if (this.numPopupWidth < (elemList[i] as HTMLElement).offsetWidth) {
                this.numPopupWidth = (elemList[i] as HTMLElement).offsetWidth;
            }
        }
        let popWidth: number = this.numPopupWidth + 160;
        (document.querySelector('.e-numformat-ddb.e-dropdown-popup') as HTMLElement).style.width = `${popWidth}px`;
    }

    private previewNumFormat(args: MenuEventArgs): void {
        let cellIndex: number[] = getCellIndexes(this.parent.getActiveSheet().activeCell);
        let cell: CellModel = getCell(cellIndex[0], cellIndex[1], this.parent.getActiveSheet());
        let eventArgs: { [key: string]: string | number | boolean } = {
            type: args.item.text,
            formattedText: '',
            value: cell && cell.value ? cell.value : '',
            format: getFormatFromType(args.item.text as NumberFormatType),
            sheetIndex: this.parent.activeSheetTab,
            onLoad: true
        };
        let numElem: HTMLElement = this.parent.createElement('div', {
            className: 'e-numformat-text',
            styles: 'width:100%',
            innerHTML: args.element.innerHTML
        });
        args.element.innerHTML = '';
        this.parent.notify(getFormattedCellObject, eventArgs);
        let previewElem: HTMLElement = this.parent.createElement('span', {
            className: 'e-numformat-preview-text',
            styles: 'float:right;',
            innerHTML: eventArgs.formattedText.toString()
        });
        numElem.appendChild(previewElem);
        args.element.appendChild(numElem);
    }

    private refreshRibbonContent(activeTab: number): void {
        if (isNullOrUndefined(activeTab)) { activeTab = this.ribbon.selectedTab; }
        let l10n: L10n = this.parent.serviceLocator.getService(locale);
        switch (this.ribbon.items[activeTab].header.text) {
            case l10n.getConstant('Home'): this.refreshHomeTabContent(getCellIndexes(this.parent.getActiveSheet().activeCell));
                break;
            case l10n.getConstant('Insert'):
                // Second tab functionality comes here
                break;
            case l10n.getConstant('Formulas'):
                // Third tab functionality comes here
                break;
            case l10n.getConstant('View'): this.refreshViewTabContent(activeTab);
                break;
        }
    }

    private refreshHomeTabContent(indexes: number[]): void {
        if (!isNullOrUndefined(document.getElementById(this.parent.element.id + '_number_format'))) {
            this.numFormatDDB = getComponent(document.getElementById(this.parent.element.id + '_number_format'), DropDownButton);
        }
        let actCell: number[] = getCellIndexes(this.parent.getActiveSheet().activeCell);
        let l10n: L10n = this.parent.serviceLocator.getService(locale);
        let cell: CellModel = getCell(actCell[0], actCell[1], this.parent.getActiveSheet(), true);
        cell = cell ? cell : {};
        let type: string = getTypeFromFormat(cell.format ? cell.format : 'General');
        if (this.numFormatDDB) {
            this.refreshNumFormatSelection(l10n.getConstant(type));
        }
        if (this.fontNameDdb) {
            this.refreshFontNameSelection(this.getCellStyleValue('fontFamily', indexes));
        }
        if (this.fontSizeDdb) {
            let value: string = this.getCellStyleValue('fontSize', indexes).split('pt')[0];
            if (value !== this.fontSizeDdb.content) {
                this.fontSizeDdb.content = value; this.fontSizeDdb.dataBind();
            }
        }
        if (this.textAlignDdb) {
            let value: string = `e-icons e-${this.getCellStyleValue('textAlign', indexes).toLowerCase()}-icon`;
            if (value !== this.textAlignDdb.iconCss) {
                this.textAlignDdb.iconCss = value; this.textAlignDdb.dataBind();
            }
        }
        if (this.verticalAlignDdb) {
            let value: string = `e-icons e-${this.getCellStyleValue('verticalAlign', indexes).toLowerCase()}-icon`;
            if (value !== this.verticalAlignDdb.iconCss) {
                this.verticalAlignDdb.iconCss = value; this.verticalAlignDdb.dataBind();
            }
        }
        this.refreshToggleBtn(indexes);
    }
    private refreshToggleBtn(indexes: number[]): void {
        let btn: HTMLElement; let id: string = this.parent.element.id; let value: string;
        let fontProps: string[] = ['fontWeight', 'fontStyle', 'textDecoration', 'textDecoration'];
        ['bold', 'italic', 'line-through', 'underline'].forEach((name: string, index: number): void => {
            btn = document.getElementById(`${id}_${name}`);
            if (btn) {
                value = this.getCellStyleValue(fontProps[index], indexes).toLowerCase();
                if (value.indexOf(name) > -1) {
                    btn.classList.add('e-active');
                } else {
                    if (btn.classList.contains('e-active')) { btn.classList.remove('e-active'); }
                }
            }
        });
    }
    private refreshFontNameSelection(fontFamily: string): void {
        if (fontFamily !== this.fontNameDdb.items[this.fontNameIndex].text) {
            this.fontNameDdb.element.firstElementChild.textContent = fontFamily;
            for (let i: number = 0; i < this.fontNameDdb.items.length; i++) {
                if (this.fontNameDdb.items[i].text === fontFamily) {
                    this.fontNameDdb.items[i].iconCss = 'e-icons e-selected-icon';
                    this.fontNameDdb.items[this.fontNameIndex].iconCss = '';
                    this.fontNameDdb.setProperties({ 'items': this.fontNameDdb.items }, true);
                    this.fontNameIndex = i;
                    break;
                }
            }
        }
    }

    private refreshNumFormatSelection(type: string): void {
        let l10n: L10n = this.parent.serviceLocator.getService(locale);
        for (let i: number = 0; i < this.numFormatDDB.items.length; i++) {
            if (this.numFormatDDB.items[i].iconCss !== '') {
                this.numFormatDDB.items[i].iconCss = '';
            }
            if (this.numFormatDDB.items[i].text === type) {
                this.numFormatDDB.items[i].iconCss = 'e-icons e-selected-icon';
            }
        }
        this.numFormatDDB.element.firstElementChild.textContent = type;
        this.numFormatDDB.setProperties({ 'items': this.numFormatDDB.items }, true);
    }

    private fileItemSelect(args: MenuEventArgs): void {
        let selectArgs: MenuSelectArgs = <MenuSelectArgs>extend({ cancel: false }, args);
        this.parent.trigger('fileItemSelect', selectArgs);
        if (!selectArgs.cancel) {
            switch (args.item.id) {
                case 'Open':
                    (this.parent.element.querySelector('#' + this.parent.element.id + '_fileUpload') as HTMLElement).click();
                    break;
                case 'Xlsx':
                case 'Xls':
                case 'Csv':
                    this.parent.save({ saveType: args.item.id });
                    break;
                case 'New':
                    let dialogInst: Dialog = (this.parent.serviceLocator.getService(dialog) as Dialog);
                    dialogInst.show({
                        height: 200, width: 400, isModal: true, showCloseIcon: true,
                        content: (this.parent.serviceLocator.getService(locale) as L10n).getConstant('DestroyAlert'),
                        beforeOpen: (): void => this.parent.element.focus(),
                        buttons: [{
                            buttonModel: {
                                content: (this.parent.serviceLocator.getService(locale) as L10n).getConstant('Ok'), isPrimary: true
                            },
                            click: (): void => {
                                this.parent.sheets.length = 0; this.parent.createSheet(); dialogInst.hide();
                                this.parent.activeSheetTab = this.parent.sheets.length;
                                this.parent.setProperties({ 'activeSheetTab': this.parent.sheets.length }, true);
                                this.parent.notify(refreshSheetTabs, {});
                                this.parent.notify(sheetsDestroyed, {});
                                this.parent.renderModule.refreshSheet();
                            }
                        }]
                    });
                    break;
            }
        }
    }
    private toolbarClicked(args: ClickEventArgs): void {
        let parentId: string = this.parent.element.id;
        let sheet: SheetModel = this.parent.getActiveSheet();
        switch (args.item.id) {
            case parentId + '_headers':
                let evtHArgs: { isShow: boolean, sheetIdx: number, cancel: boolean } = {
                    isShow: !sheet.showHeaders,
                    sheetIdx: this.parent.activeSheetTab,
                    cancel: false
                };
                this.parent.notify(completeAction, { eventArgs: evtHArgs, action: 'headers' });
                if (evtHArgs.cancel) { return; }
                sheet.showHeaders = !sheet.showHeaders;
                this.parent.setProperties({ 'sheets': this.parent.sheets }, true);
                (this.parent.serviceLocator.getService('sheet') as IRenderer).showHideHeaders();
                this.toggleRibbonItems({ props: 'Headers', activeTab: this.ribbon.selectedTab });
                this.parent.element.focus();
                break;
            case parentId + '_gridlines':
                let evtglArgs: { isShow: boolean, sheetIdx: number, cancel: boolean } = {
                    isShow: !sheet.showGridLines,
                    sheetIdx: this.parent.activeSheetTab,
                    cancel: false
                };
                this.parent.notify(completeAction, { eventArgs: evtglArgs, action: 'gridLines' });
                if (evtglArgs.cancel) { return; }
                sheet.showGridLines = !sheet.showGridLines;
                this.parent.setProperties({ 'sheets': this.parent.sheets }, true);
                this.toggleRibbonItems({ props: 'GridLines', activeTab: this.ribbon.selectedTab });
                this.parent.element.focus();
                break;
            case parentId + '_undo':
                this.parent.notify(performUndoRedo, { isUndo: true });
                break;
            case parentId + '_redo':
                this.parent.notify(performUndoRedo, { isUndo: false });
                break;
        }
        this.parent.notify(ribbonClick, args);
    }

    private toggleRibbonItems(args: { props: 'Headers' | 'GridLines', activeTab: number}): void {
        let tabHeader: string = (this.parent.serviceLocator.getService(locale) as L10n).getConstant('View');
        if (isNullOrUndefined(args.activeTab)) {
            for (let i: number = 0; i < this.ribbon.items.length; i++) {
                if (this.ribbon.items[i].header.text === tabHeader) { args.activeTab = i; break; }
            }
        }
        let text: string = this.getLocaleText(args.props, true); let id: string = `${this.parent.element.id}_${args.props.toLowerCase()}`;
        for (let i: number; i < this.ribbon.items[args.activeTab].content.length; i++) {
            if (this.ribbon.items[args.activeTab].content[i].type === 'Separator') { continue; }
            if (this.ribbon.items[args.activeTab].content[i].id === id) {
                this.ribbon.items[args.activeTab].content[i].text = text; this.ribbon.setProperties({ 'items': this.ribbon.items }, true);
            }
        }
        if (this.ribbon.items[this.ribbon.selectedTab].header.text === tabHeader) { this.updateToggleText(args.props.toLowerCase(), text); }
    }

    private enableFileMenuItems(args: { items: string[], enable: boolean }): void {
        this.ribbon.enableMenuItems(args.items, args.enable);
    }

    private hideRibbonTabs(args: { tabs: string[], hide: boolean }): void {
        let isActiveTab: boolean; let idx: number;
        let tabCollection: HTMLElement[] = selectAll('.e-ribbon .e-tab-header .e-toolbar-item:not(.e-menu-tab)', this.parent.element);
        args.tabs.forEach((tab: string): void => {
            for (let i: number = 0; i < this.ribbon.items.length; i++) {
                if (tab === this.ribbon.items[i].header.text) { idx = i; break; }
            }
            if (idx !== undefined) {
                if (args.hide) {
                    tabCollection[idx].classList.add('e-hide');
                    if (idx === this.ribbon.selectedTab) { isActiveTab = true; }
                } else {
                    if (tabCollection[idx].classList.contains('e-hide')) {
                        if (isActiveTab === undefined) {
                            isActiveTab = select(
                                '.e-ribbon .e-tab-header .e-toolbar-item:not(.e-menu-tab):not(.e-hide)', this.parent.element) ? false :
                                true;
                        }
                        tabCollection[idx].classList.remove('e-hide');
                    }
                }
                idx = undefined;
            }
        });
        let nextTab: HTMLElement;
        if (isActiveTab) {
            nextTab = <HTMLElement>select(
                '.e-ribbon .e-tab-header .e-toolbar-item:not(.e-menu-tab):not(.e-hide)', this.parent.element);
            if (nextTab) {
                this.toggleCollapsed();
                let activeIdx: number = [].slice.call(tabCollection).indexOf(nextTab);
                this.ribbon.selectedTab = activeIdx; this.ribbon.dataBind();
            } else {
                this.toggleCollapsed();
            }
        }
        this.parent.updateActiveBorder(tabCollection[this.ribbon.selectedTab]);
    }

    private toggleCollapsed(): void {
        if (this.ribbon.element.classList.contains('e-collapsed')) {
            this.ribbon.element.classList.remove('e-collapsed');
            this.ribbon.element.querySelector('.e-drop-icon').classList.remove('e-disabled');
        } else {
            this.ribbon.element.classList.add('e-collapsed');
            this.ribbon.element.querySelector('.e-drop-icon').classList.add('e-disabled');
        }
    }

    private addRibbonTabs(args: { items: RibbonItemModel[], insertBefore: string }): void {
        this.ribbon.addTabs(args.items, args.insertBefore);
        let nextTab: HTMLElement = <HTMLElement>select(
                '.e-ribbon .e-tab-header .e-toolbar-item:not(.e-menu-tab).e-hide', this.parent.element);
        if (nextTab) {
            this.parent.updateActiveBorder(selectAll(
                '.e-ribbon .e-tab-header .e-toolbar-item:not(.e-menu-tab)', this.parent.element)[this.ribbon.selectedTab]);
        }
    }

    private updateToggleText(item: string, text: string): void {
        getUpdateUsingRaf((): void => {
            this.ribbon.element.querySelector(`#${this.parent.element.id}_${item} .e-tbar-btn-text`).textContent = text;
        });
    }

    private refreshViewTabContent(activeTab: number): void {
        let id: string = this.parent.element.id; let updated: boolean;
        for (let i: number = 0; i < this.ribbon.items[activeTab].content.length; i++) {
            if (this.ribbon.items[activeTab].content[i].type === 'Separator') { continue; }
            if (this.ribbon.items[activeTab].content[i].id === `${id}_headers`) {
                this.updateViewTabContent(activeTab, 'Headers', i);
                if (updated) { break; } updated = true;
            }
            if (this.ribbon.items[activeTab].content[i].id === `${id}_gridlines`) {
                this.updateViewTabContent(activeTab, 'GridLines', i);
                if (updated) { break; } updated = true;
            }
        }
    }

    private updateViewTabContent(activeTab: number, item: string, idx: number): void {
        let sheet: SheetModel = this.parent.getActiveSheet();
        let l10n: L10n = this.parent.serviceLocator.getService(locale);
        if (sheet['show' + item]) {
            if (this.ribbon.items[activeTab].content[idx].text === l10n.getConstant('Show' + item)) {
                this.updateShowHideBtn('Hide', item, idx, activeTab);
            }
        } else {
            if (this.ribbon.items[activeTab].content[idx].text === l10n.getConstant('Hide' + item)) {
                this.updateShowHideBtn('Show', item, idx, activeTab);
            }
        }
    }

    private updateShowHideBtn(showHideText: string, item: string, idx: number, activeTab: number): void {
        let l10n: L10n = this.parent.serviceLocator.getService(locale);
        let text: string = l10n.getConstant(showHideText + item);
        this.ribbon.items[activeTab].content[idx].text = text;
        this.ribbon.setProperties({ 'items': this.ribbon.items }, true);
        this.updateToggleText(item.toLowerCase(), text);
    }

    private addToolbarItems(args: { tab: string, items: ItemModel[], index: number }): void {
        this.ribbon.addToolbarItems(args.tab, args.items, args.index);
    }

    private enableRibbonItems(args: { id: string, isEnable: boolean }[]): void {
        for (let i: number = 0, len: number = args.length; i < len; i++) {
            let ele: Element = document.getElementById(args[i].id);
            if (ele) {
                this.ribbon.enableItems(args[i].isEnable, <HTMLElement>closest(ele, '.e-toolbar-item'));
            }
        }
    }

    private createMobileView(): void {
        let parentId: string = this.parent.element.id;
        let toobar: HTMLElement = this.parent.createElement('div', { className: 'e-header-toolbar' });
        let menu: HTMLUListElement = this.parent.createElement('ul') as HTMLUListElement;
        toobar.appendChild(menu);
        let toolbarObj: Toolbar = new Toolbar({
            items: [
                { prefixIcon: 'e-tick-icon', align: 'Left', id: parentId + 'focused_tick', cssClass: 'e-focused-tick' },
                { template: menu, align: 'Right', id: parentId + 'file_menu' },
            ],
            clicked: (args: ClickEventArgs): void => {
                switch (args.item.id) {
                    case parentId + 'focused_tick':
                        this.parent.element.classList.remove('e-mobile-focused');
                        this.parent.renderModule.setSheetPanelSize();
                        break;
                }
            },
            created: (): void => {
                let menuObj: Menu = new Menu(
                    {
                        cssClass: 'e-mobile e-file-menu',
                        enableRtl: true,
                        showItemOnClick: true,
                        items: this.getRibbonMenuItems(),
                        select: this.fileItemSelect.bind(this),
                        beforeOpen: (args: BeforeOpenCloseMenuEventArgs): void => {
                            args.element.parentElement.classList.remove('e-rtl');
                            this.fileMenuBeforeOpen(args);
                        },
                        beforeClose: this.fileMenuBeforeClose.bind(this)
                    });
                menuObj.createElement = this.parent.createElement;
                menuObj.appendTo(menu);
            }
        });
        toolbarObj.createElement = this.parent.createElement;
        toolbarObj.appendTo(toobar);
        this.parent.element.insertBefore(toobar, this.parent.element.firstElementChild);
        this.renderMobileToolbar();
    }
    private renderMobileToolbar(): void {
        let toolbarPanel: HTMLElement = this.parent.createElement('div', { className: 'e-toolbar-panel e-ribbon' });
        let toolbar: HTMLElement = this.parent.createElement('div');
        let ddb: HTMLButtonElement = this.parent.createElement('button') as HTMLButtonElement;
        toolbarPanel.appendChild(toolbar); toolbarPanel.appendChild(ddb);
        toolbarPanel.style.display = 'block';
        this.parent.element.appendChild(toolbarPanel);
        let ddbObj: DropDownButton = new DropDownButton({
            cssClass: 'e-caret-hide',
            content: this.ribbon.items[0].header.text as string,
            items: [
                { text: this.ribbon.items[0].header.text as string },
                { text: this.ribbon.items[1].header.text as string },
                { text: this.ribbon.items[2].header.text as string },
                { text: this.ribbon.items[3].header.text as string }
            ],
            select: (args: MenuEventArgs): void => {
                if (args.item.text !== ddbObj.content) {
                    toolbarObj.element.style.display = 'none';
                    ddbObj.content = args.item.text;
                    ddbObj.dataBind();
                    toolbarObj.items = this.ribbon.items[(ddbObj.items as MenuItemModel[]).indexOf(args.item) + 1].content;
                    toolbarObj.width = `calc(100% - ${ddb.getBoundingClientRect().width}px)`;
                    toolbarObj.element.style.display = '';
                    toolbarObj.dataBind();
                    toolbarObj.items[0].text = args.item.text;
                    toolbarObj.dataBind();
                }
            },
            open: (args: OpenCloseMenuEventArgs): void => {
                let element: HTMLElement = args.element.parentElement;
                let clientRect: ClientRect = element.getBoundingClientRect();
                let offset: OffsetPosition = calculatePosition(ddbObj.element, 'right', 'bottom');
                element.style.left = `${offset.left - clientRect.width}px`;
                element.style.top = `${offset.top - clientRect.height}px`;
                for (let i: number = 0; i < ddbObj.items.length; i++) {
                    if (ddbObj.content === ddbObj.items[i].text) {
                        args.element.children[i].classList.add('e-selected');
                        break;
                    }
                }
            },
            close: (): void => this.parent.element.focus()
        });
        ddbObj.createElement = this.parent.createElement;
        ddbObj.appendTo(ddb);
        let toolbarObj: Toolbar = new Toolbar({
            width: `calc(100% - ${ddb.getBoundingClientRect().width}px)`,
            items: this.ribbon.items[0].content,
            clicked: this.toolbarClicked.bind(this)
        });
        toolbarObj.createElement = this.parent.createElement;
        toolbarObj.appendTo(toolbar);
        toolbarPanel.style.display = '';
    }
    private fileMenuBeforeOpen(args: BeforeOpenCloseMenuEventArgs): void {
        let l10n: L10n = this.parent.serviceLocator.getService(locale); let wrapper: HTMLElement;
        let contents: string[] = ['.xlsx', '.xls', '.csv'];
        if (args.parentItem.text === l10n.getConstant('SaveAs')) {
            [].slice.call(args.element.children).forEach((li: HTMLElement, index: number): void => {
                wrapper = this.parent.createElement('div', { innerHTML: li.innerHTML });
                li.innerHTML = '';
                wrapper.appendChild(this.parent.createElement('span', { className: 'e-extension', innerHTML: contents[index] }));
                li.appendChild(wrapper);
            });
        }
        this.parent.trigger('fileMenuBeforeOpen', args);
    }
    private fileMenuBeforeClose(args: BeforeOpenCloseMenuEventArgs): void {
        this.parent.trigger('fileMenuBeforeClose', args);
    }

    private addEventListener(): void {
        this.parent.on(ribbon, this.initRibbon, this);
        this.parent.on(enableRibbonItems, this.enableRibbonItems, this);
        this.parent.on(activeCellChanged, this.refreshRibbonContent, this);
        this.parent.on(enableToolbar, this.enableToolbar, this);
        this.parent.on(updateToggleItem, this.toggleRibbonItems, this);
        this.parent.on(enableFileMenuItems, this.enableFileMenuItems, this);
        this.parent.on(hideRibbonTabs, this.hideRibbonTabs, this);
        this.parent.on(addRibbonTabs, this.addRibbonTabs, this);
        this.parent.on(addToolbarItems, this.addToolbarItems, this);
    }
    public destroy(): void {
        let parentElem: HTMLElement = this.parent.element;
        let ribbonEle: HTMLElement = this.ribbon.element;
        let id: string = parentElem.id;
        destroyComponent(parentElem.querySelector('#' + id + '_paste'), SplitButton);
        destroyComponent(parentElem.querySelector('#' + id + '_number_format'), DropDownButton);
        destroyComponent(parentElem.querySelector('#' + id + '_font_size'), DropDownButton);
        destroyComponent(parentElem.querySelector('#' + id + '_font_name'), DropDownButton);
        destroyComponent(parentElem.querySelector('#' + id + '_text_align'), DropDownButton);
        destroyComponent(parentElem.querySelector('#' + id + '_vertical_align'), DropDownButton);
        destroyComponent(parentElem.querySelector('#' + id + '_sorting'), DropDownButton);
        ['bold', 'italic', 'line-through', 'underline'].forEach((name: string): void => {
            destroyComponent(parentElem.querySelector('#' + `${id}_${name}`), Button);
        });
        this.ribbon.destroy();
        if (ribbonEle) { detach(ribbonEle); } this.ribbon = null;
        this.removeEventListener();
    }
    private removeEventListener(): void {
        if (!this.parent.isDestroyed) {
            this.parent.off(ribbon, this.initRibbon);
            this.parent.off(enableRibbonItems, this.enableRibbonItems);
            this.parent.off(activeCellChanged, this.refreshRibbonContent);
            this.parent.off(enableToolbar, this.enableToolbar);
            this.parent.off(updateToggleItem, this.toggleRibbonItems);
            this.parent.off(enableFileMenuItems, this.enableFileMenuItems);
            this.parent.off(hideRibbonTabs, this.hideRibbonTabs);
            this.parent.off(addRibbonTabs, this.addRibbonTabs);
            this.parent.off(addToolbarItems, this.addToolbarItems);
        }
    }
}