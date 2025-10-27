import React, { useEffect, useState } from 'react';
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import { useAuth } from '../../auth/useAuth';
import { AuthContext } from '../../auth/AuthContext';
import SortableTask from './SortableTask';

const API_ROOT = 'http://localhost:5000/api/kanban';

export default function KanbanBoard() {
  const { user, headers } = useAuth(AuthContext);

  const [boards, setBoards] = useState([]);
  const [selectedBoardId, setSelectedBoardId] = useState(null);
  const [columns, setColumns] = useState([]); // [{ id, name, position, tasks: [] }]
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskColumnId, setNewTaskColumnId] = useState(null);
  const [creatingColName, setCreatingColName] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch API wrapper
  const apiRequester = async (url, opts = {}) => {
    const res = await fetch(url, {
      credentials: 'include',
      headers,
      ...opts,
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'API error');
    }
    return res.json();
  };

  // Load boards on mount
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const allBoards = await apiRequester(`${API_ROOT}/boards`);
        setBoards(allBoards);
        if (allBoards.length > 0) setSelectedBoardId(allBoards[0].id);
        setLoading(false);
      } catch (e) {
        setError(e.message);
        setLoading(false);
      }
    })();
  }, []);

  // Load columns and tasks for selected board
  useEffect(() => {
    if (!selectedBoardId) return;
    (async () => {
      setLoading(true);
      try {
        let cols = await apiRequester(`${API_ROOT}/boards/${selectedBoardId}/columns`);
        cols = await Promise.all(
          cols.map(async col => {
            const colTasks = await apiRequester(`${API_ROOT}/columns/${col.id}/tasks`);
            return { ...col, tasks: colTasks };
          })
        );
        setColumns(cols);
        setLoading(false);
      } catch (e) {
        setError(e.message);
        setLoading(false);
      }
    })();
  }, [selectedBoardId]);

  // Handle drag end event (tasks only)
  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) return;

    const sourceColIndex = columns.findIndex(c => c.id === source.droppableId);
    const destColIndex = columns.findIndex(c => c.id === destination.droppableId);
    if (sourceColIndex === -1 || destColIndex === -1) return;

    const sourceCol = columns[sourceColIndex];
    const destCol = columns[destColIndex];

    let newSourceTasks = Array.from(sourceCol.tasks);
    const [movedTask] = newSourceTasks.splice(source.index, 1);
    let newDestTasks = destCol.tasks === undefined ? [] : Array.from(destCol.tasks);
    newDestTasks.splice(destination.index, 0, movedTask);

    if (sourceCol.id !== destCol.id) {
      movedTask.column_id = destCol.id;
    }

    const newColumns = [...columns];
    newColumns[sourceColIndex] = { ...sourceCol, tasks: newSourceTasks };
    newColumns[destColIndex] = { ...destCol, tasks: newDestTasks };
    setColumns(newColumns);

    // Persist order to backend
    const updateTasksPosition = async (col) => {
      for (let i = 0; i < col.tasks.length; i++) {
        const task = col.tasks[i];
        await apiRequester(`${API_ROOT}/tasks/${task.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ position: i, column_id: col.id }),
        });
      }
    };

    try {
      await updateTasksPosition(newColumns[sourceColIndex]);
      if (sourceColIndex !== destColIndex) {
        await updateTasksPosition(newColumns[destColIndex]);
      }
    } catch (e) {
      setError(e.message);
    }
  };

  // Handle add task
  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !newTaskColumnId) return;
    setActionLoading(true);
    try {
      const newTask = await apiRequester(`${API_ROOT}/columns/${newTaskColumnId}/tasks`, {
        method: 'POST',
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          position: columns.find(c => c.id === newTaskColumnId)?.tasks.length || 0
        }),
      });
      setColumns(cols => cols.map(col => {
        if (col.id === newTaskColumnId) {
          return { ...col, tasks: [...(col.tasks || []), newTask] };
        }
        return col;
      }));
      setNewTaskTitle('');
      setNewTaskColumnId(null);
      setActionLoading(false);
    } catch (e) {
      setError(e.message);
      setActionLoading(false);
    }
  };

  // Handle add column
  const handleAddColumn = async () => {
    if (!creatingColName.trim()) return;
    setActionLoading(true);
    try {
      const newCol = await apiRequester(`${API_ROOT}/boards/${selectedBoardId}/columns`, {
        method: 'POST',
        body: JSON.stringify({ name: creatingColName, position: columns.length }),
      });
      setColumns(cols => [...cols, { ...newCol, tasks: [] }]);
      setCreatingColName('');
      setActionLoading(false);
    } catch (e) {
      setError(e.message);
      setActionLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-900 text-gray-100 font-sans">
      {/* Board selector bar */}
      <div className="flex p-4 border-b border-gray-800 bg-gray-800 space-x-2">
        {boards.map(board => (
          <button
            key={board.id}
            onClick={() => setSelectedBoardId(board.id)}
            className={`px-4 py-2 rounded-full font-bold transition-colors shadow text-sm ${
              board.id === selectedBoardId
                ? 'bg-teal-600 text-white'
                : 'bg-gray-900 text-teal-300 hover:bg-teal-700 hover:text-white'
            }`}
          >
            {board.name}
          </button>
        ))}
      </div>

      {/* Main kanban grid */}
      {loading ? (
        <div className="flex-grow flex items-center justify-center text-teal-300 text-lg animate-pulse">Loading...</div>
      ) : (
        <>
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex space-x-6 overflow-x-auto p-7 bg-gray-900 flex-grow">
              {columns.map(col => (
                <Droppable
                  isDropDisabled={false}
                  isCombineEnabled={false}
                  ignoreContainerClipping={false}
                  droppableId={col.id}
                  key={col.id}
                >
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="bg-gray-800 rounded-2xl border-2 border-gray-700 shadow-lg w-80 flex flex-col max-h-[90vh] min-h-[320px] transition-colors duration-150"
                    >
                      <h3 className="p-4 font-extrabold text-teal-400 border-b border-gray-700 text-lg">{col.name}</h3>
                      <div className="flex-grow p-3 space-y-3 overflow-auto min-h-[200px]">
                        {col.tasks && col.tasks.map((task, index) => (
                          <SortableTask key={task.id} task={task} index={index} />
                        ))}
                        {provided.placeholder}
                      </div>
                      {/* Add task section */}
                      <div className="p-3 border-t border-gray-800 bg-gray-900">
                        <input
                          type="text"
                          placeholder="New task title"
                          className="w-full px-3 py-2 mb-2 rounded-xl bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-shadow text-sm"
                          value={newTaskColumnId === col.id ? newTaskTitle : ''}
                          onChange={e => {
                            setNewTaskColumnId(col.id);
                            setNewTaskTitle(e.target.value);
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && newTaskColumnId === col.id) {
                              handleAddTask();
                            }
                          }}
                          disabled={actionLoading}
                        />
                        <button
                          className="w-full bg-teal-600 text-white rounded-full px-3 py-2 text-sm font-bold shadow-md hover:bg-teal-500 active:bg-teal-700 transition-all disabled:opacity-50"
                          disabled={!newTaskTitle.trim() || newTaskColumnId !== col.id || actionLoading}
                          onClick={handleAddTask}
                        >
                          Add Task
                        </button>
                      </div>
                    </div>
                  )}
                </Droppable>
              ))}
              {/* Add column section */}
              <div className="w-80 bg-gray-800 rounded-2xl border-2 border-teal-700 shadow-xl p-6 flex flex-col justify-start min-h-[320px]">
                <h3 className="font-extrabold text-teal-400 mb-3 border-b border-gray-700 pb-2 text-lg">Add Column</h3>
                <input
                  type="text"
                  className="w-full px-3 py-2 mb-3 rounded-xl bg-gray-900 border border-gray-700 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-600 transition-shadow text-sm"
                  placeholder="Column name"
                  value={creatingColName}
                  onChange={e => setCreatingColName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddColumn(); }}
                  disabled={actionLoading}
                />
                <button
                  className="bg-teal-600 text-white rounded-full px-3 py-2 text-sm font-bold shadow-md hover:bg-teal-500 active:bg-teal-700 transition-all disabled:opacity-50"
                  disabled={!creatingColName.trim() || actionLoading}
                  onClick={handleAddColumn}
                >
                  Add Column
                </button>
              </div>
            </div>
          </DragDropContext>
          {/* Error toast */}
          {error && (
            <div className="fixed bottom-6 right-6 p-4 bg-red-600 text-white rounded-xl shadow-lg font-bold flex items-center space-x-3 z-30 animate-in fade-in">
              <span>Error: {error}</span>
              <button className="ml-4 underline text-teal-200 hover:text-white" onClick={() => setError(null)}>
                Dismiss
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
