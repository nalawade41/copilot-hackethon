import { useEffect } from 'react';
import {
  ToolGroupManager,
  PanTool,
  WindowLevelTool,
  Enums as ToolEnums,
} from '@cornerstonejs/tools';
import { CORNERSTONE_IDS } from '../constants';

const { MouseBindings } = ToolEnums;

/**
 * Reconfigures the tool group bindings based on the kind of imageIds being
 * rendered. WindowLevelTool on a pre-rendered PNG throws "Viewport is not a
 * valid type" because raw DICOM pixel values aren't available to remap. In
 * that case we rebind left-drag to Pan and disable W/L.
 */
export function useToolBindings(imageIds: string[]): void {
  useEffect(() => {
    if (imageIds.length === 0) return;
    const toolGroup = ToolGroupManager.getToolGroup(CORNERSTONE_IDS.toolGroupId);
    if (!toolGroup) return;

    const isServerRendered = imageIds[0].startsWith('web:');
    if (isServerRendered) {
      toolGroup.setToolDisabled(WindowLevelTool.toolName);
      toolGroup.setToolActive(PanTool.toolName, {
        bindings: [{ mouseButton: MouseBindings.Primary }],
      });
    } else {
      toolGroup.setToolActive(WindowLevelTool.toolName, {
        bindings: [{ mouseButton: MouseBindings.Primary }],
      });
      toolGroup.setToolActive(PanTool.toolName, {
        bindings: [{ mouseButton: MouseBindings.Auxiliary }],
      });
    }
  }, [imageIds]);
}
