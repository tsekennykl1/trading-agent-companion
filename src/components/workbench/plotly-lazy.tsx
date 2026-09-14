// Client-only Plotly bundle. Loaded lazily so the heavy plotly.js bundle never
// reaches the server render or the initial page payload.
import createPlotlyComponent from "react-plotly.js/factory";
// @ts-expect-error — the dist bundle ships no type declarations
import Plotly from "plotly.js-dist-min";

const Plot = createPlotlyComponent(Plotly);

export default Plot;
