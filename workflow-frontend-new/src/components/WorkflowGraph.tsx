
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  Handle,
  Position,
  Panel,
  useReactFlow,
} from "@xyflow/react";
import type { Node, Edge, NodeProps } from "@xyflow/react";
import dagre from "dagre";
import "@xyflow/react/dist/style.css";

type WorkflowTask = {
  id: number;
  name: string;
  description: string;
  estimatedDuration: number | null;
  taskType: "MANUAL" | "AUTOMATED";
};

type WorkflowDependency = {
  id: number;
  sourceTask: number;
  targetTask: number;
};

type WorkflowExecutionOrder = {
  workflowId: number;
  message: string;
  orderedTaskIds: number[];
};

type WorkflowGraphProps = {
  tasks: WorkflowTask[];
  dependencies: WorkflowDependency[];
  executionOrder: WorkflowExecutionOrder | null;
};

type TaskNodeData = {
  label: string;
  description: string;
  taskType: string;
  duration: number;
  order: number | null;
  [key: string]: unknown;
};

const NODE_WIDTH = 240;
const NODE_HEIGHT = 142;

function TaskNode({ data, selected }: NodeProps<Node<TaskNodeData>>) {
  const isAutomated = data.taskType === "AUTOMATED";

  return (
    <div
      className={`workflow-graph-node ${selected ? "selected" : ""} ${
        isAutomated ? "automated" : "manual"
      } ${data.order !== null ? "ordered" : ""}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="workflow-node-handle"
      />

      <div className="workflow-graph-node-header">
        <span className="workflow-node-type-icon">
          {isAutomated ? "⚙" : "✓"}
        </span>

        <div className="workflow-node-title">
          <strong title={data.label}>{data.label}</strong>
          <span>{isAutomated ? "Automated task" : "Manual task"}</span>
        </div>

        {data.order !== null && (
          <span className="workflow-graph-order">{data.order}</span>
        )}
      </div>

      <p className="workflow-node-description">
        {data.description || "No description provided"}
      </p>

      <div className="workflow-graph-node-meta">
        <span>{data.taskType}</span>
        <span>{data.duration} min</span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="workflow-node-handle"
      />
    </div>
  );
}

const nodeTypes = {
  task: TaskNode,
};

function CanvasActions({
  onAutoLayout,
  onFitView,
}: {
  onAutoLayout: () => void;
  onFitView: () => void;
}) {
  return (
    <Panel position="top-right" className="workflow-canvas-actions">
      <button type="button" onClick={onAutoLayout} title="Restore automatic layout">
        <span>↻</span> Auto layout
      </button>

      <button type="button" onClick={onFitView} title="Fit all tasks in view">
        <span>⛶</span> Fit view
      </button>
    </Panel>
  );
}

function WorkflowCanvas({
  nodes,
  edges,
  onAutoLayout,
  onSelectTask,
}: {
  nodes: Node<TaskNodeData>[];
  edges: Edge[];
  onAutoLayout: () => void;
  onSelectTask: (taskId: string | null) => void;
}) {
  const { fitView } = useReactFlow();

  const handleFitView = useCallback(() => {
    void fitView({ padding: 0.2, duration: 250 });
  }, [fitView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.25}
      maxZoom={2}
      onNodeClick={(_, node) => onSelectTask(node.id)}
      onPaneClick={() => onSelectTask(null)}
      defaultEdgeOptions={{
        type: "smoothstep",
        animated: false,
        style: { stroke: "#8b72ed", strokeWidth: 2 },
      }}
      nodesDraggable
      nodesConnectable={false}
      elementsSelectable
      panOnDrag
      zoomOnScroll
      zoomOnPinch
      deleteKeyCode={null}
      proOptions={{ hideAttribution: true }}
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={20}
        size={1}
        color="#d9d5eb"
      />

      <Controls showInteractive={false} />

      <MiniMap
        pannable
        zoomable
        nodeColor={(node) => {
          const data = node.data as TaskNodeData;
          if (data.order !== null) return "#16a34a";
          return data.taskType === "AUTOMATED" ? "#8b5cf6" : "#64748b";
        }}
        maskColor="rgba(245, 243, 255, 0.7)"
      />

      <CanvasActions
        onAutoLayout={onAutoLayout}
        onFitView={handleFitView}
      />
    </ReactFlow>
  );
}

export default function WorkflowGraph({
  tasks,
  dependencies,
  executionOrder,
}: WorkflowGraphProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [layoutVersion, setLayoutVersion] = useState(0);

  const { nodes, edges } = useMemo(() => {
    const graph = new dagre.graphlib.Graph();

    graph.setDefaultEdgeLabel(() => ({}));
    graph.setGraph({
      rankdir: "TB",
      nodesep: 70,
      ranksep: 100,
      marginx: 40,
      marginy: 40,
    });

    const orderByTaskId = new Map<number, number>();

    executionOrder?.orderedTaskIds.forEach((taskId, index) => {
      orderByTaskId.set(taskId, index + 1);
    });

    tasks.forEach((task) => {
      graph.setNode(String(task.id), {
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      });
    });

    dependencies.forEach((dependency) => {
      const sourceExists = tasks.some(
        (task) => task.id === dependency.sourceTask
      );
      const targetExists = tasks.some(
        (task) => task.id === dependency.targetTask
      );

      if (sourceExists && targetExists) {
        graph.setEdge(
          String(dependency.sourceTask),
          String(dependency.targetTask)
        );
      }
    });

    dagre.layout(graph);

    const graphNodes: Node<TaskNodeData>[] = tasks.map((task) => {
      const position = graph.node(String(task.id));

      return {
        id: String(task.id),
        type: "task",
        position: {
          x: (position?.x ?? 0) - NODE_WIDTH / 2,
          y: (position?.y ?? 0) - NODE_HEIGHT / 2,
        },
        data: {
          label: task.name,
          description: task.description,
          taskType: task.taskType,
          duration: task.estimatedDuration ?? 0,
          order: orderByTaskId.get(task.id) ?? null,
        },
      };
    });

    const graphEdges: Edge[] = dependencies
      .filter(
        (dependency) =>
          tasks.some((task) => task.id === dependency.sourceTask) &&
          tasks.some((task) => task.id === dependency.targetTask)
      )
      .map((dependency) => ({
        id: `dependency-${dependency.id}`,
        source: String(dependency.sourceTask),
        target: String(dependency.targetTask),
        type: "smoothstep",
        animated: true,
        markerEnd: {
          type: "arrowclosed" as const,
          color: "#8b72ed",
        },
        style: {
          stroke: "#8b72ed",
          strokeWidth: 2,
        },
      }));

    return {
      nodes: graphNodes,
      edges: graphEdges,
    };
  }, [tasks, dependencies, executionOrder, layoutVersion]);

  useEffect(() => {
    if (
      selectedTaskId &&
      !tasks.some((task) => String(task.id) === selectedTaskId)
    ) {
      setSelectedTaskId(null);
    }
  }, [tasks, selectedTaskId]);

  const selectedTask = tasks.find(
    (task) => String(task.id) === selectedTaskId
  );

  const handleAutoLayout = useCallback(() => {
    setLayoutVersion((version) => version + 1);
    setSelectedTaskId(null);
  }, []);

  if (tasks.length === 0) {
    return (
      <div className="workflow-graph-empty">
        <div className="workflow-graph-empty-icon">⑂</div>
        <h3>Your canvas is ready</h3>
        <p>Add tasks to visualize their order and dependencies.</p>
      </div>
    );
  }

  return (
    <div className="workflow-graph-workspace">
      <div className="workflow-graph-container">
       <ReactFlowProvider>
         <WorkflowCanvas
           nodes={nodes}
           edges={edges}
           onAutoLayout={handleAutoLayout}
           onSelectTask={setSelectedTaskId}
         />
       </ReactFlowProvider>
      </div>

      {selectedTask && (
        <aside className="workflow-task-inspector">
          <div className="workflow-inspector-header">
            <div>
              <span className="workflow-inspector-eyebrow">
                TASK DETAILS
              </span>
              <h3>{selectedTask.name}</h3>
            </div>

            <button
              type="button"
              onClick={() => setSelectedTaskId(null)}
              aria-label="Close task details"
            >
              ×
            </button>
          </div>

          <p>
            {selectedTask.description || "No description provided."}
          </p>

          <div className="workflow-inspector-row">
            <span>Type</span>
            <strong>{selectedTask.taskType}</strong>
          </div>

          <div className="workflow-inspector-row">
            <span>Duration</span>
            <strong>{selectedTask.estimatedDuration ?? 0} min</strong>
          </div>

          <div className="workflow-inspector-row">
            <span>Task ID</span>
            <strong>{selectedTask.id}</strong>
          </div>
        </aside>
      )}
    </div>
  );
}
