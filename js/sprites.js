'use strict';
// MineBomb - pixel sprite data for entities
(function () {
  const PAL = {
    S: '#f1c27d', K: '#111111', W: '#ffffff', G: '#9a9a9a', g: '#555555', R: '#e63946', r: '#8b1a1a',
    O: '#ff8c00', Y: '#ffd93d', B: '#3a86ff', b: '#1d3f8f', N: '#4caf50', n: '#2e6b2e', P: '#ff9ecf',
    p: '#7b2cbf', T: '#8b5a2b', t: '#5a3a1a', L: '#a0e9ff', A: '#d2b48c', E: '#9fff5f', U: '#ffd700',
    I: '#dff6ff', V: '#c77dff', X: '#ff3b00', M: '#ff00aa', D: '#3e2723', F: '#ffb6c1', Z: '#00e5ff', Q: '#6d6875',
  };
  const SPR = {};
  function spr(key, rows) { SPR[key] = { rows, w: rows[0].length, h: rows.length }; }

  // humans
  spr('human', ['.S.', 'CCC', '.C.', '.C.', 'K.K']);
  spr('soldier', ['.G..', 'CCCW', 'GCGW', '.C..', 'K.K.']);
  spr('settler', ['.S..', 'CCCT', '.C.T', '.C.T', 'K.K.']);
  spr('hero', ['.Y..', 'CSCW', 'RCRW', '.C..', 'K.K.']);
  spr('leader', ['UUU', '.S.', 'CCC', '.C.', 'K.K']);
  spr('wizard', ['.B.', 'BBB', '.S.', 'BBB', '.B.', 'K.K']);
  spr('trader', ['.S.', 'TCT', 'UCU', '.C.', 'K.K']);
  spr('bandit', ['.K.', 'KSK', 'rrr', '.r.', 'K.K']);
  spr('zombie', ['.N.', 'nNn', '.N.', '.n.', 'K.K']);
  spr('skeleton', ['.W.', 'WWW', '.W.', '.W.', 'W.W']);
  spr('vampire', ['.W.', 'KWK', 'KKK', 'rKr', 'K.K']);
  spr('mummy', ['.A.', 'AAA', '.A.', 'AAA', 'A.A']);
  spr('cultist', ['.p.', 'pSp', 'ppp', '.p.', 'K.K']);
  spr('alien', ['.NN.', 'NKKN', '.NN.', '.NN.', 'N..N']);
  spr('robot', ['GGG', 'GRG', 'GGG', 'gGg', 'G.G']);
  spr('angel', ['.Y.', 'WSW', 'WWW', '.W.', '.W.']);
  spr('demon', ['K.K', 'RRR', 'RYR', 'RRR', 'R.R']);
  spr('imp', ['K.K', '.R.', 'RRR', 'R.R']);
  spr('ghost', ['.WW.', 'WWWW', 'WKWK', 'WWWW', 'W.W.']);
  spr('giant', ['.SSS..', '.SSS..', 'TTTTTT', 'TTTTTT', '.TTTT.', '.TTTT.', '.TTTT.', '.T..T.', '.T..T.']);
  spr('golem', ['.GGG.', 'GGGGG', 'GgGgG', 'GGGGG', '.GGG.', '.G.G.', '.G.G.']);
  spr('yeti', ['.WWW.', 'WWWWW', 'WKWKW', 'WWWWW', '.WWW.', '.W.W.']);
  spr('slime', ['.NN.', 'NNNN', 'NKNK', 'NNNN']);
  spr('gingerbread', ['.T.', 'TWT', 'WTW', '.T.', 'T.T']);
  spr('witch', ['.K.', 'KKK', '.N.', 'ppp', '.p.', 'K.K']);
  spr('fairy', ['L.L', '.P.', 'L.L']);
  spr('reaper', ['.KK.', 'KKKK', 'KWWK', '.KK.', '.KK.', 'K..K']);
  spr('snowman', ['.WW.', 'WKWK', '.WW.', 'WWWW', 'WWWW']);
  spr('santa', ['.R.', 'WSW', 'RRR', 'RRR', 'K.K']);
  spr('genie', ['.Z.', 'ZSZ', 'ZZZ', '.Z.', '.Z.']);
  spr('cupid', ['.P.', 'WSW', 'PPP', '.P.']);
  spr('mech', ['.GGG.', 'GRRRG', 'GGGGG', 'gGGGg', 'G...G', 'G...G']);
  spr('treant', ['.nnn.', 'nnnnn', '.nTn.', '..T..', '.T.T.']);
  // animals
  spr('cow', ['WWWW.', 'WKWWP', 'WWWW.', 'K..K.']);
  spr('sheep', ['.WWW.', 'WWWWK', 'WWWW.', 'K..K.']);
  spr('pig', ['PPPP.', 'PPPPF', 'PPPP.', 'P..P.']);
  spr('chicken', ['RW.', 'WWO', '.O.']);
  spr('horse', ['..TT.', 'TTTTT', 'TTTT.', 'T..T.']);
  spr('goat', ['K.K..', '.WWW.', 'WWWWK', 'W..W.']);
  spr('deer', ['t.t..', '.AAA.', 'AAAAK', 'A..A.']);
  spr('rabbit', ['W.W', 'WWW', 'WWK']);
  spr('fox', ['O...O', 'OOOOO', 'OOOOW', 'O...O']);
  spr('wolf', ['G...G', 'GGGGG', 'GGGGK', 'G...G']);
  spr('bear', ['TT..', 'TTTT', 'TTTK', 'T..T']);
  spr('boar', ['tt...', 'tttt.', 'ttttW', 't..t.']);
  spr('camel', ['..A..', '.AAA.', 'AAAAA', 'A.A.A']);
  spr('elephant', ['.GGGG', 'GGGGG', 'GGGGG', 'G.G.G']);
  spr('lion', ['OOO..', 'OAOOO', 'OOOOO', 'O...O']);
  spr('tiger', ['O.O..', 'OKOOO', 'OOOOO', 'O...O']);
  spr('zebra', ['..WK.', 'WKWKW', 'KWKWK', 'W..W.']);
  spr('giraffe', ['...Y.', '...Y.', '..YY.', 'YYYY.', 'Y..Y.']);
  spr('monkey', ['.TT.', 'TSST', '.TT.', 'T..T']);
  spr('penguin', ['.K.', 'KWK', 'KWK', 'Y.Y']);
  spr('fish', ['LB.', 'BBB', 'LB.']);
  spr('shark', ['..G...', 'GGGGGG', '.G..G.']);
  spr('whale', ['....b..', 'bbbbbbb', 'bbbbbbb', '.b...b.']);
  spr('dolphin', ['..LL.', 'LLLLL', '.L...']);
  spr('turtle', ['.nn.', 'nNNn', '.nn.']);
  spr('octopus', ['.pp.', 'pppp', 'p.pp', 'p.p.']);
  spr('crab', ['R.R', 'RRR', 'R.R']);
  spr('bird', ['K.K', '.K.']);
  spr('frog', ['N.N', 'NNN', 'N.N']);
  spr('snake', ['NN..', '.NNN', '..N.']);
  spr('scorpion', ['K..K', 'KKKK', 'K.K.']);
  spr('butterfly', ['M.M', '.K.', 'M.M']);
  spr('bee', ['KY', 'YK']);
  spr('rat', ['.gg.', 'gggP', 'g..g']);
  spr('cat', ['K.K.', 'KKKK', 'KKK.', 'K.K.']);
  spr('dog', ['T.T..', 'TTTT.', 'TTTTK', 'T..T.']);
  spr('duck', ['.Y.', 'YYO', 'YYY']);
  spr('dodo', ['.GG.', 'GGGO', '.GG.', 'Y.Y.']);
  spr('mammoth', ['.TTTT', 'TTTTT', 'TTTTT', 'T.T.T']);
  spr('hippo', ['GGGG.', 'GGGGP', 'GGGG.', 'G..G.']);
  spr('crocodile', ['nnnnn.', 'nnnnnK', 'n.n.n.']);
  spr('kangaroo', ['..TT', '.TTT', 'TTT.', 'T.T.']);
  spr('panda', ['KWWK', 'WKKW', 'WWWW', 'K..K']);
  spr('unicorn', ['..Y..', '.WWW.', 'WWWWP', 'WWWW.', 'W..W.']);
  spr('pegasus', ['W...W', '.WWW.', 'WWWWW', 'WWWW.', 'W..W.']);
  spr('griffin', ['Y...Y', '.YYY.', 'YYYYO', 'TTTT.', 'T..T.']);
  spr('phoenix', ['O...O', '.OOO.', 'OOYOO', '.OOO.', '..O..']);
  spr('dragon', ['R.......R', 'RR.....RR', '.RRRRRRR.', '..RRRRRRY', '...RRR...', '..R.R.R..']);
  spr('kraken', ['..ppp..', '.ppppp.', '.pKpKp.', '.ppppp.', 'p.p.p.p', 'p.p.p.p']);
  spr('kaiju', ['..nn....', '.nnnn...', '.nYnn...', '.nnnnn..', 'nnnnnnn.', 'nnnnnnnn', '.nnnnn..', '.nnnnn..', '.nn.nn..', '.nn.nn..']);
  spr('spider', ['K.KK.K', '.KKKK.', 'KKRRKK', '.KKKK.', 'K.KK.K']);
  spr('hydra', ['N.N.N', 'NNNNN', '.NNN.', '.NNN.', 'N...N']);
  spr('eye', ['.WWW.', 'WWBWW', 'WBKBW', 'WWBWW', '.WWW.']);
  spr('goo', ['.GG.', 'GZGG', 'GGGZ', '.GG.']);
  spr('boat', ['..C..', '..CC.', '..CCC', 'TTTTT', '.TTT.']);
  spr('warship', ['..C..', 'g.CC.', 'ggggg', 'ggggg']);
  spr('pirate', ['..K..', '..KW.', '..KKK', 'tttt', '.ttt.']);
  spr('ufo', ['..LL..', '.LLLL.', 'GGGGGG', '.Y.Y.Y']);
  spr('bomb', ['..O..', '.KKK.', 'KKKKK', 'KKKKK', '.KKK.']);
  spr('nuke', ['..O..', '.GGG.', 'GGYGG', 'GYYYG', '.GGG.']);
  spr('missile', ['G....', 'GGGGR', 'G....']);
  spr('turret', ['.GG.', 'GRRG', 'GGGG', '.gg.']);
  spr('mine', ['.g.', 'gRg', 'ggg']);
  spr('totem', ['.T.', 'YTY', '.T.', 'RTR', '.T.']);
  spr('statue', ['.G.', 'GGG', '.G.', '.G.', 'GGG']);
  spr('monolith', ['KK', 'KK', 'KK', 'KK', 'KK']);
  spr('campfire', ['.O.', 'OYO', 'TTT']);
  spr('rod', ['.Y.', '.G.', '.G.', 'GGG']);
  spr('machine', ['GGGG', 'GZZG', 'GZZG', 'gGGg']);
  spr('rocket', ['.W.', 'WWW', 'WWW', 'RWR', 'O.O']);
  spr('balloon', ['.RR.', 'RRRR', '.RR.', '..K.']);
  spr('egg', ['.OO.', 'OOOO', 'OYYO', '.OO.']);
  spr('sign', ['TTT', 'TTT', '.T.']);
  spr('beacon', ['.Z.', 'ZZZ', '.G.', 'GGG']);
  spr('well', ['GGG', 'GBG', 'GGG']);
  spr('scarecrow', ['.Y.', 'TTT', '.T.', '.T.']);
  spr('portal', ['.VV.', 'VKKV', 'VKKV', '.VV.']);
  spr('generic', ['.XX.', 'XXXX', '.XX.']);

  MB.PAL = PAL;
  MB.SPR = SPR;
})();
