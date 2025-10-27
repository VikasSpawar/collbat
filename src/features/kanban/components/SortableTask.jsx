import React from 'react';
import { Draggable } from 'react-beautiful-dnd';

export default function SortableTask({ task, index }) {
  return (
    <Draggable draggableId={task.id} index={index} key={task.id}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`px-4 py-3 rounded-xl shadow-lg font-semibold text-gray-100 bg-gray-800 border border-gray-700 cursor-pointer 
            transition-all duration-150
            ${snapshot.isDragging ? 'opacity-70 bg-teal-700 shadow-2xl border-teal-500' : 'opacity-100'}
            hover:bg-teal-600 hover:shadow-xl
          `}
          title={task.title}
        >
          {task.title}
        </div>
      )}
    </Draggable>
  );
}
