// src/types/entities.js

export const TypeEntity = { 
  id: Number, 
  name: String, 
  color: String | null 
};

export const TaskEntity = { 
  id: Number, 
  type_id: Number, 
  title: String, 
  description: String | null, 
  status: String 
};

export const SubtaskEntity = { 
  id: Number, 
  task_id: Number, 
  title: String, 
  done: Boolean, 
  order_index: Number 
};










