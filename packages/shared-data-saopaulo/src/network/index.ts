import { SP_L1 } from "./lines/SP_L1.ts";
import { SP_L2 } from "./lines/SP_L2.ts";
import { SP_L3 } from "./lines/SP_L3.ts";
import { SP_L4 } from "./lines/SP_L4.ts";
import { SP_L5 } from "./lines/SP_L5.ts";
import { SP_L15 } from "./lines/SP_L15.ts";
import { SP_L17 } from "./lines/SP_L17.ts";
import type { TransferSeed } from "./types.ts";

export const SAO_PAULO_LINES = [
  SP_L1,
  SP_L2,
  SP_L3,
  SP_L4,
  SP_L5,
  SP_L15,
  SP_L17,
];

export const SAO_PAULO_TRANSFERS: TransferSeed[] = [
  // L1 <-> L2 — plataformas adjacentes (as mais rápidas)
  {
    id: "tr_paraiso_l1_l2",
    fromPlatformId: "plt_paraiso_l1",
    toPlatformId: "plt_paraiso_l2",
    walkingSeconds: 60,
    accessibilityFriendly: true,
    platformChange: false,
  },
  {
    id: "tr_paraiso_l2_l1",
    fromPlatformId: "plt_paraiso_l2",
    toPlatformId: "plt_paraiso_l1",
    walkingSeconds: 60,
    accessibilityFriendly: true,
    platformChange: false,
  },
  {
    id: "tr_anarosa_l1_l2",
    fromPlatformId: "plt_ana_rosa_l1",
    toPlatformId: "plt_ana_rosa_l2",
    walkingSeconds: 60,
    accessibilityFriendly: true,
    platformChange: false,
  },
  {
    id: "tr_anarosa_l2_l1",
    fromPlatformId: "plt_ana_rosa_l2",
    toPlatformId: "plt_ana_rosa_l1",
    walkingSeconds: 60,
    accessibilityFriendly: true,
    platformChange: false,
  },

  // L1 <-> L3 — o caos da Sé
  {
    id: "tr_se_l1_l3",
    fromPlatformId: "plt_se_l1",
    toPlatformId: "plt_se_l3",
    walkingSeconds: 180,
    accessibilityFriendly: true,
    platformChange: true,
  },
  {
    id: "tr_se_l3_l1",
    fromPlatformId: "plt_se_l3",
    toPlatformId: "plt_se_l1",
    walkingSeconds: 180,
    accessibilityFriendly: true,
    platformChange: true,
  },

  // L1 <-> L4 — descida da Luz
  {
    id: "tr_luz_l1_l4",
    fromPlatformId: "plt_luz_l1",
    toPlatformId: "plt_luz_l4",
    walkingSeconds: 300,
    accessibilityFriendly: true,
    platformChange: true,
  },
  {
    id: "tr_luz_l4_l1",
    fromPlatformId: "plt_luz_l4",
    toPlatformId: "plt_luz_l1",
    walkingSeconds: 300,
    accessibilityFriendly: true,
    platformChange: true,
  },

  // L1 <-> L5 — escadarias Santa Cruz
  {
    id: "tr_santacruz_l1_l5",
    fromPlatformId: "plt_santa_cruz_l1",
    toPlatformId: "plt_santa_cruz_l5",
    walkingSeconds: 240,
    accessibilityFriendly: true,
    platformChange: true,
  },
  {
    id: "tr_santacruz_l5_l1",
    fromPlatformId: "plt_santa_cruz_l5",
    toPlatformId: "plt_santa_cruz_l1",
    walkingSeconds: 240,
    accessibilityFriendly: true,
    platformChange: true,
  },

  // L2 <-> L4 — o infame túnel Consolação/Paulista
  {
    id: "tr_consolacao_l2_l4",
    fromPlatformId: "plt_consolacao_l2",
    toPlatformId: "plt_paulista_l4",
    walkingSeconds: 420,
    accessibilityFriendly: false,
    platformChange: true,
  },
  {
    id: "tr_paulista_l4_l2",
    fromPlatformId: "plt_paulista_l4",
    toPlatformId: "plt_consolacao_l2",
    walkingSeconds: 420,
    accessibilityFriendly: false,
    platformChange: true,
  },

  // L2 <-> L5 — baldeação eficiente Chácara Klabin
  {
    id: "tr_klabin_l2_l5",
    fromPlatformId: "plt_chacara_klabin_l2",
    toPlatformId: "plt_chacara_klabin_l5",
    walkingSeconds: 120,
    accessibilityFriendly: true,
    platformChange: true,
  },
  {
    id: "tr_klabin_l5_l2",
    fromPlatformId: "plt_chacara_klabin_l5",
    toPlatformId: "plt_chacara_klabin_l2",
    walkingSeconds: 120,
    accessibilityFriendly: true,
    platformChange: true,
  },

  // L3 <-> L4 — República
  {
    id: "tr_republica_l3_l4",
    fromPlatformId: "plt_republica_l3",
    toPlatformId: "plt_republica_l4",
    walkingSeconds: 180,
    accessibilityFriendly: true,
    platformChange: true,
  },
  {
    id: "tr_republica_l4_l3",
    fromPlatformId: "plt_republica_l4",
    toPlatformId: "plt_republica_l3",
    walkingSeconds: 180,
    accessibilityFriendly: true,
    platformChange: true,
  },

  // L2 <-> L15 — Vila Prudente monotrilho
  {
    id: "tr_vilaprudente_l2_l15",
    fromPlatformId: "plt_vila_prudente_l2",
    toPlatformId: "plt_vila_prudente_l15",
    walkingSeconds: 180,
    accessibilityFriendly: true,
    platformChange: true,
  },
  {
    id: "tr_vilaprudente_l15_l2",
    fromPlatformId: "plt_vila_prudente_l15",
    toPlatformId: "plt_vila_prudente_l2",
    walkingSeconds: 180,
    accessibilityFriendly: true,
    platformChange: true,
  },

  // L5 <-> L17 — Campo Belo subterrâneo para elevado
  {
    id: "tr_campobelo_l5_l17",
    fromPlatformId: "plt_campo_belo_l5",
    toPlatformId: "plt_campo_belo_l17",
    walkingSeconds: 180,
    accessibilityFriendly: true,
    platformChange: true,
  },
  {
    id: "tr_campobelo_l17_l5",
    fromPlatformId: "plt_campo_belo_l17",
    toPlatformId: "plt_campo_belo_l5",
    walkingSeconds: 180,
    accessibilityFriendly: true,
    platformChange: true,
  },
];
