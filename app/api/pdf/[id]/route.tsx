import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import React from "react";
import { sql } from "@/lib/db";

export const maxDuration = 30;

const TEAL = "#055671";
const TEAL_DARK = "#044556";
const INK = "#1a2a30";
const INK_SOFT = "#4a5a60";
const RULE = "#d8e2e4";
const STRONG = "#2d7a4f";
const MIXED = "#e07b2c";
const WEAK = "#c44b3a";

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function positionColor(pos: string) {
  if (pos === "ahead") return STRONG;
  if (pos === "behind") return WEAK;
  return MIXED;
}

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10, color: INK },
  eyebrow: { fontSize: 9, color: TEAL, letterSpacing: 2, marginBottom: 8, fontFamily: "Helvetica-Bold" },
  url: { fontSize: 22, fontFamily: "Helvetica-Bold", color: INK, marginBottom: 4 },
  metaRow: { fontSize: 8, color: INK_SOFT, marginBottom: 20 },
  divider: { borderBottomWidth: 1, borderBottomColor: RULE, marginVertical: 14 },
  sectionLabel: { fontSize: 10, fontFamily: "Helvetica-Bold", color: TEAL, letterSpacing: 1.5, marginBottom: 10, textTransform: "uppercase" },
  sectionIntro: { fontSize: 9, color: INK_SOFT, marginBottom: 14, lineHeight: 1.4 },
  scoreRow: { flexDirection: "row", alignItems: "center", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: RULE },
  scoreRowLabel: { fontSize: 9.5, width: 150, fontFamily: "Helvetica-Bold" },
  scoreBarTrack: { flex: 1, height: 6, backgroundColor: "#e8edee", borderRadius: 3, marginHorizontal: 10 },
  scoreBarFill: { height: 6, borderRadius: 3 },
  scoreRowValue: { fontSize: 10, width: 40, textAlign: "right", fontFamily: "Helvetica-Bold" },
  dimBlock: { marginBottom: 16 },
  dimHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  dimLabel: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  dimPosition: { fontSize: 8, fontFamily: "Helvetica-Bold", paddingVertical: 2, paddingHorizontal: 7, borderRadius: 3, color: "#fff" },
  dimWho: { fontSize: 8, fontFamily: "Helvetica-Bold", color: TEAL, letterSpacing: 0.5, marginBottom: 2, textTransform: "uppercase" },
  dimText: { fontSize: 9, color: INK_SOFT, lineHeight: 1.4, marginBottom: 6 },
  swotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  swotCard: { width: "48%", padding: 10, backgroundColor: "#f7f9fa", borderLeftWidth: 3 },
  swotTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" },
  swotItem: { fontSize: 8.5, color: INK_SOFT, marginBottom: 4, lineHeight: 1.4 },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, fontSize: 8, color: INK_SOFT, textAlign: "center", borderTopWidth: 1, borderTopColor: RULE, paddingTop: 10 },
});

function ComparisonPdf({ audit }: { audit: any }) {
  const result = audit.result;
  const dateStr = new Date(audit.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const brandHost = hostname(result.brandUrl);

  const scoreRows = [
    { url: result.brandUrl, score: result.seoScores.brand, isBrand: true },
    ...(result.seoScores.competitors || []).map((c: any) => ({ url: c.url, score: c.score, isBrand: false })),
  ];
  const maxScore = Math.max(...scoreRows.map((r) => r.score || 0), 1);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrow}>COMPETITOR ANALYSIS REPORT</Text>
        <Text style={styles.url}>{brandHost}</Text>
        <Text style={styles.metaRow}>Prepared by Westward Marketing Lab · {dateStr}</Text>
        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>SEO Visibility</Text>
        <Text style={styles.sectionIntro}>
          A real, comparable 0-100 score across crawlability, technical performance, on-page optimization, site architecture, content quality, structured data, and off-site authority — run identically against your site and each competitor.
        </Text>
        {scoreRows.map((r, i) => {
          const color = r.isBrand ? TEAL : r.score >= 70 ? STRONG : r.score >= 45 ? MIXED : WEAK;
          const pct = maxScore > 0 ? (r.score / maxScore) * 100 : 0;
          return (
            <View key={i} style={styles.scoreRow}>
              <Text style={styles.scoreRowLabel}>{hostname(r.url)}{r.isBrand ? " (you)" : ""}</Text>
              <View style={styles.scoreBarTrack}>
                <View style={{ ...styles.scoreBarFill, width: `${Math.max(2, pct)}%`, backgroundColor: color }} />
              </View>
              <Text style={{ ...styles.scoreRowValue, color }}>{r.score}</Text>
            </View>
          );
        })}

        {result.comparative && (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>Comparative Analysis</Text>
            {result.comparative.dimensions.map((d: any, i: number) => (
              <View key={i} style={styles.dimBlock} wrap={false}>
                <View style={styles.dimHeader}>
                  <Text style={styles.dimLabel}>{d.label}</Text>
                  <Text style={{ ...styles.dimPosition, backgroundColor: positionColor(d.brandPosition) }}>
                    {d.brandPosition.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.dimWho}>You</Text>
                <Text style={styles.dimText}>{d.brandAssessment}</Text>
                {(d.competitorAssessments || []).map((c: any, j: number) => (
                  <React.Fragment key={j}>
                    <Text style={styles.dimWho}>{hostname(c.url)}</Text>
                    <Text style={styles.dimText}>{c.assessment}</Text>
                  </React.Fragment>
                ))}
              </View>
            ))}
          </>
        )}

        {result.comparative && result.comparative.swot && (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>SWOT Summary</Text>
            <View style={styles.swotGrid}>
              <View style={{ ...styles.swotCard, borderLeftColor: STRONG }}>
                <Text style={{ ...styles.swotTitle, color: STRONG }}>Strengths</Text>
                {(result.comparative.swot.strengths || []).map((s: string, i: number) => (
                  <Text key={i} style={styles.swotItem}>• {s}</Text>
                ))}
              </View>
              <View style={{ ...styles.swotCard, borderLeftColor: WEAK }}>
                <Text style={{ ...styles.swotTitle, color: WEAK }}>Weaknesses</Text>
                {(result.comparative.swot.weaknesses || []).map((s: string, i: number) => (
                  <Text key={i} style={styles.swotItem}>• {s}</Text>
                ))}
              </View>
              <View style={{ ...styles.swotCard, borderLeftColor: TEAL }}>
                <Text style={{ ...styles.swotTitle, color: TEAL }}>Opportunities</Text>
                {(result.comparative.swot.opportunities || []).map((s: string, i: number) => (
                  <Text key={i} style={styles.swotItem}>• {s}</Text>
                ))}
              </View>
              <View style={{ ...styles.swotCard, borderLeftColor: MIXED }}>
                <Text style={{ ...styles.swotTitle, color: MIXED }}>Threats</Text>
                {(result.comparative.swot.threats || []).map((s: string, i: number) => (
                  <Text key={i} style={styles.swotItem}>• {s}</Text>
                ))}
              </View>
            </View>
          </>
        )}

        <Text style={styles.footer} fixed>
          Westward Marketing Lab · westwardmarketinglab.com · This audit is a single snapshot — a full engagement digs deeper into every dimension.
        </Text>
      </Page>
    </Document>
  );
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const rows = await sql`SELECT id, brand_url, result, created_at FROM comp_audits WHERE id = ${params.id}`;

  if (rows.length === 0) {
    return NextResponse.json({ error: "Audit not found." }, { status: 404 });
  }

  const buffer = await renderToBuffer(React.createElement(ComparisonPdf, { audit: rows[0] }) as any);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="competitor-analysis-${rows[0].id}.pdf"`,
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
