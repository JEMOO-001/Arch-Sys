## **1) Difference between arithmetic mean, median, and mode**
- **Arithmetic mean**: Sum of all values divided by the number of values. It uses every observation, so it is sensitive to outliers.
- **Median**: Middle value after sorting the data (or average of the two middle values for an even sample size). It is robust to outliers.
- **Mode**: Most frequently occurring value(s). It is useful for categorical or discrete data and can be unimodal, multimodal, or have no mode.

## **2) Define the standard deviation**
Standard deviation is a measure of dispersion that shows how far observations typically deviate from their mean.

- Population standard deviation:

\[
\sigma = \sqrt{\frac{1}{N}\sum_{i=1}^{N}(x_i-\mu)^2}
\]

- Sample standard deviation:

\[
s = \sqrt{\frac{1}{n-1}\sum_{i=1}^{n}(x_i-\bar{x})^2}
\]

A small standard deviation means values are tightly clustered around the mean; a large one means higher spread.

## **3) Least squares method (example from geodesy/geoinformatics)**
Least squares estimates unknown parameters by minimizing the sum of squared residuals:

\[
\min \sum v_i^2
\]

where \(v_i\) are observation errors (residuals).

### Example: Leveling network adjustment in geodesy
Suppose we measure height differences between benchmarks A, B, and C multiple times with small random errors. The observations are redundant and may conflict slightly.

- Unknowns: adjusted benchmark heights.
- Observation equations: measured height differences as functions of unknown heights.
- Residuals: differences between observed and computed height differences.
- Least squares finds adjusted heights that minimize total squared residuals, producing the most probable set of heights under random error assumptions.

In geoinformatics, the same principle is used in coordinate transformation, georeferencing, GNSS positioning, and trend fitting.

## **4) Normal distribution**
The normal (Gaussian) distribution is a continuous, symmetric, bell-shaped distribution characterized by mean \(\mu\) and variance \(\sigma^2\).

Key properties:
- Mean = median = mode.
- Fully determined by \(\mu\) and \(\sigma\).
- About 68.27% of values lie within \(\pm 1\sigma\), 95.45% within \(\pm 2\sigma\), and 99.73% within \(\pm 3\sigma\).
- Many geodetic measurement errors are modeled as approximately normal after removing systematic effects.

## **5) Tests used in geodesy and geoinformatics (and why)**
- **Chi-square (\(\chi^2\)) test**: checks if variance factor/noise level agrees with the stochastic model.
- **t-test**: tests significance of parameter estimates (e.g., slope, coordinate shift).
- **F-test**: compares variances/models (e.g., whether a refined model significantly improves fit).
- **Baarda's data snooping / outlier tests**: detects gross errors in observations.
- **Normality tests (e.g., Shapiro-Wilk, Kolmogorov-Smirnov)**: verify residual normality assumptions.

Why these tests are used:
- to validate model assumptions,
- to identify blunders/outliers,
- to assess reliability and precision of estimates,
- to justify acceptance or rejection of adjustment results.

## **6) Diagram/problem**
### (a) Geodesy and geoinformatics context
The graph can be interpreted as a relationship between measured quantity and time/position (for example, displacement vs. time, residuals vs. station index, or elevation profile vs. distance). The general trend suggests that values initially fluctuate around a baseline and then show a systematic deviation in one segment.

From this, we can infer:
- there may be a stable period followed by a localized anomaly,
- random noise is present, but a non-random pattern appears in part of the data,
- this may indicate instrument drift, local ground movement, control point instability, or processing bias.

Recommended actions:
- repeat measurements on the suspicious segment,
- run outlier and variance-factor tests on residuals,
- compare with independent sensors/data sources (GNSS, total station, leveling),
- inspect equipment calibration and environmental conditions,
- if deformation is suspected, increase observation frequency and add control points.

### (b) Daily-life context
A similar graph could represent daily electricity consumption over a month. Most days stay around a normal range, but a sudden rise appears during a few days. This could be due to increased air-conditioner usage, a new appliance, or unusual weather.

What can be inferred and done:
- baseline usage is stable most of the time,
- short abnormal peaks should be investigated,
- additional checks (appliance-level monitoring) can confirm the cause,
- if the pattern repeats, repairs or behavior changes may be needed to reduce waste.
