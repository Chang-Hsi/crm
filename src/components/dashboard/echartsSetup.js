import { use } from "echarts/core";
import {
  BarChart,
  FunnelChart,
  HeatmapChart,
  LineChart,
  PieChart,
  ScatterChart,
} from "echarts/charts";
import {
  GraphicComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  VisualMapComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

let registered = false;

function ensureDashboardCharts() {
  if (registered) {
    return;
  }

  use([
    BarChart,
    FunnelChart,
    HeatmapChart,
    LineChart,
    PieChart,
    ScatterChart,
    GraphicComponent,
    GridComponent,
    LegendComponent,
    TooltipComponent,
    VisualMapComponent,
    CanvasRenderer,
  ]);

  registered = true;
}

export { ensureDashboardCharts };
