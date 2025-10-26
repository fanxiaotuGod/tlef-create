{{/*
Expand the name of the chart.
*/}}
{{- define "tlef-create.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "tlef-create.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "tlef-create.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "tlef-create.labels" -}}
helm.sh/chart: {{ include "tlef-create.chart" . }}
{{ include "tlef-create.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
environment: {{ .Values.global.environment }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "tlef-create.selectorLabels" -}}
app.kubernetes.io/name: {{ include "tlef-create.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "tlef-create.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "tlef-create.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Frontend full name
*/}}
{{- define "tlef-create.frontend.fullname" -}}
{{- printf "%s-frontend" (include "tlef-create.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Backend full name
*/}}
{{- define "tlef-create.backend.fullname" -}}
{{- printf "%s-backend" (include "tlef-create.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
MongoDB full name
*/}}
{{- define "tlef-create.mongodb.fullname" -}}
{{- printf "%s-mongodb" (include "tlef-create.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Qdrant full name
*/}}
{{- define "tlef-create.qdrant.fullname" -}}
{{- printf "%s-qdrant" (include "tlef-create.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
SAML full name
*/}}
{{- define "tlef-create.saml.fullname" -}}
{{- printf "%s-saml" (include "tlef-create.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}
