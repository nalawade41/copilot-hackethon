import { useEffect, useRef, type RefObject } from 'react';
import { RenderingEngine, Enums, type Types } from '@cornerstonejs/core';
import {
  addTool,
  ToolGroupManager,
  PanTool,
  ZoomTool,
  WindowLevelTool,
  StackScrollTool,
  Enums as ToolEnums,
} from '@cornerstonejs/tools';
import { CORNERSTONE_IDS } from '../constants';

const { MouseBindings } = ToolEnums;

let toolsRegistered = false;
function registerToolsOnce() {
  if (toolsRegistered) return;
  addTool(PanTool);
  addTool(ZoomTool);
  addTool(WindowLevelTool);
  addTool(StackScrollTool);
  toolsRegistered = true;
}

/**
 * Creates a Cornerstone3D rendering engine + stack viewport on mount, wires
 * up the default tool group and initial bindings, and tears everything down
 * on unmount. Returns a ref to the rendering engine.
 */
export function useCornerstoneEngine(elementRef: RefObject<HTMLDivElement | null>) {
  const engineRef = useRef<RenderingEngine | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    registerToolsOnce();

    const engine = new RenderingEngine(CORNERSTONE_IDS.renderingEngineId);
    engineRef.current = engine;

    engine.enableElement({
      viewportId: CORNERSTONE_IDS.viewportId,
      type: Enums.ViewportType.STACK,
      element,
      defaultOptions: { background: [0, 0, 0] as Types.Point3 },
    });

    const existing = ToolGroupManager.getToolGroup(CORNERSTONE_IDS.toolGroupId);
    const toolGroup = existing ?? ToolGroupManager.createToolGroup(CORNERSTONE_IDS.toolGroupId)!;
    if (!existing) {
      toolGroup.addTool(WindowLevelTool.toolName);
      toolGroup.addTool(PanTool.toolName);
      toolGroup.addTool(ZoomTool.toolName);
      toolGroup.addTool(StackScrollTool.toolName);
    }
    toolGroup.addViewport(CORNERSTONE_IDS.viewportId, CORNERSTONE_IDS.renderingEngineId);

    // Initial (client-mode) bindings. `useToolBindings` may rebind later.
    toolGroup.setToolActive(WindowLevelTool.toolName, {
      bindings: [{ mouseButton: MouseBindings.Primary }],
    });
    toolGroup.setToolActive(PanTool.toolName, {
      bindings: [{ mouseButton: MouseBindings.Auxiliary }],
    });
    toolGroup.setToolActive(ZoomTool.toolName, {
      bindings: [{ mouseButton: MouseBindings.Secondary }],
    });
    toolGroup.setToolActive(StackScrollTool.toolName, {
      bindings: [{ mouseButton: MouseBindings.Wheel }],
    });

    return () => {
      toolGroup.removeViewports(CORNERSTONE_IDS.renderingEngineId, CORNERSTONE_IDS.viewportId);
      engine.destroy();
      engineRef.current = null;
    };
    // elementRef is a ref and is intentionally omitted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return engineRef;
}
