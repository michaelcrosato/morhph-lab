/** Review data contracts. Runtime parsers are authoritative. */
import type { Genome, Vec3 } from '../core/types.js';
export type ReviewPose =
  | 'bind'
  | 'a-pose'
  | 't-pose'
  | 'reach'
  | 'twist'
  | 'crouch'
  | 'stride'
  | 'wave'
  | 'cast'
  | 'sit'
  | 'motion-cycle';
export type ReviewShading =
  | 'clay'
  | 'silhouette'
  | 'normals'
  | 'wire'
  | 'material'
  | 'stretch'
  | 'pattern';
export type ReviewView = 'front' | 'right' | 'back' | 'quarter' | 'top' | 'flight';
export interface ReviewFrame {
  center: Vec3;
  span: number;
}
export interface ReviewSettings {
  pose: ReviewPose;
  phase: number;
  shading: ReviewShading;
  view: ReviewView;
  layout: 'quad' | 'compare' | 'reference';
  target: 'desktop' | 'mobile' | 'crowd';
  bones: boolean;
  labels: boolean;
  garment: boolean;
  details: boolean;
}
export type ReviewGate =
  | 'silhouette'
  | 'proportions'
  | 'joints'
  | 'surface'
  | 'attachments'
  | 'gameplay';
export type ReviewDecision = 'unreviewed' | 'accept' | 'revise';
export interface ReviewFile {
  format: 'morph-lab-review';
  version: 1;
  implementation: string;
  source: Genome;
  candidate: Genome;
  baseline: Genome;
  settings: ReviewSettings;
  frame: ReviewFrame | null;
  lineage: { parent: string; profile: string; amount: number };
  review: {
    resetReason: string | null;
    decisions: Record<ReviewGate, ReviewDecision>;
    notes: string;
    fingerprint: string | null;
    status: 'not-approved' | 'revision-requested' | 'reviewer-accepted';
  };
  referencePolicy: string;
}
export interface ReviewMesh {
  name: string;
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  color: number[];
  material: string;
  kind: string;
  restPositions?: Float32Array;
  skin?: { indices: Uint16Array; weights: Float32Array };
}
export interface ReviewGeometry {
  meshes: ReviewMesh[];
  bones: { name: string; a: Vec3; b: Vec3 }[];
  sockets: { name: string; point: Vec3 }[];
  bounds: { min: Vec3; max: Vec3 };
  pose: string;
  phase: number;
  sampleTimeSeconds: number | null;
  blueprint: Genome | null;
  coverage: string;
  excludedGenes: number;
  inactiveGenes?: { id: string; type: string; reason: string }[];
  backend: string;
  generator: string;
  boneCount: number;
}
