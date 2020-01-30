import { Kanban, KanbanModel } from '../../src/kanban/index';
import { generateKanbanData } from '../../spec/kanban/common/kanban-data.spec';
import '../../node_modules/es6-promise/dist/es6-promise';

/**
 * kanban sample
 */

let kanbanOptions: KanbanModel = {
    dataSource: generateKanbanData(),
    keyField: 'Status',
    columns: [
        { headerText: 'Backlog', keyField: 'Open, Review' },
        { headerText: 'In Progress', keyField: 'InProgress' },
        { headerText: 'Testing', keyField: 'Testing' },
        { headerText: 'Done', keyField: 'Close' }
    ],
    swimlaneSettings: {
        showEmptyRow: false,
        allowDragAndDrop: true,
        keyField: 'Assignee',
        textField: 'AssigneeName'
    },
    cardSettings: {
        contentField: 'Summary',
        headerField: 'Id'
    }
};

let kanbanObj: Kanban = new Kanban(kanbanOptions);
kanbanObj.appendTo('#kanban');
