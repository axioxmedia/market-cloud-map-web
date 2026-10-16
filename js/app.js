(function () {
  'use strict';

  var MARKETS = ['a', 'etf', 'cb', 'hk'];
  var state = {
    market: 'a',
    metric: null,
    chart: null,
  };

  function $(id) { return document.getElementById(id); }

  function fmtPct(p) {
    if (p == null || isNaN(p)) return '—';
    var s = (p >= 0 ? '+' : '') + p.toFixed(2) + '%';
    return s;
  }

  function fmtMoney(v) {
    if (v == null || !isFinite(v) || v <= 0) return '—';
    var abs = Math.abs(v);
    if (abs >= 1e12) return (v / 1e12).toFixed(2) + ' 万亿';
    if (abs >= 1e8) return (v / 1e8).toFixed(2) + ' 亿';
    if (abs >= 1e4) return (v / 1e4).toFixed(2) + ' 万';
    return v.toFixed(2);
  }

  function colorForPct(p) {
    // A-share convention: red up, green down
    var cap = 8; // % scale clamp
    var t = Math.max(-cap, Math.min(cap, p || 0)) / cap; // -1..1
    if (t >= 0) {
      var r = Math.round(40 + 180 * t);
      var g = Math.round(40 + 20 * (1 - t));
      var b = Math.round(50 + 20 * (1 - t));
      return 'rgb(' + r + ',' + g + ',' + b + ')';
    } else {
      var u = -t;
      var r2 = Math.round(30 + 20 * (1 - u));
      var g2 = Math.round(50 + 150 * u);
      var b2 = Math.round(60 + 40 * (1 - u));
      return 'rgb(' + r2 + ',' + g2 + ',' + b2 + ')';
    }
  }

  function getMarket() {
    var d = window.CloudData && window.CloudData[state.market];
    return d || null;
  }

  function currentMetricId(market) {
    if (state.metric) return state.metric;
    return market.defaultMetric || (market.metrics[0] && market.metrics[0].id);
  }

  function buildSeries(market) {
    var mid = currentMetricId(market);
    var items = market.items || [];
    var data = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var value = Number(it[mid]);
      if (!isFinite(value) || value <= 0) continue;
      data.push({
        name: it.n + ' ' + it.c,
        value: value,
        code: it.c,
        title: it.n,
        pct: it.p,
        price: it.px,
        metricId: mid,
        metricValue: value,
        stock: it.stock || '',
        scaleYi: it.scaleYi,
        itemStyle: { color: colorForPct(it.p) },
      });
    }
    // Keep chart responsive: if huge, still fine for echarts treemap
    return data;
  }

  function metricLabel(market, id) {
    var ms = market.metrics || [];
    for (var i = 0; i < ms.length; i++) {
      if (ms[i].id === id) return ms[i].label;
    }
    return id;
  }

  function renderMetrics(market) {
    var box = $('metrics');
    box.innerHTML = '';
    var mid = currentMetricId(market);
    (market.metrics || []).forEach(function (m) {
      var btn = document.createElement('button');
      btn.className = 'metric-btn' + (m.id === mid ? ' active' : '');
      btn.type = 'button';
      btn.textContent = m.label;
      btn.dataset.metric = m.id;
      btn.addEventListener('click', function () {
        state.metric = m.id;
        render();
      });
      box.appendChild(btn);
    });
  }

  function updateMeta() {
    var meta = (window.CloudData && window.CloudData.meta) || {};
    var market = getMarket();
    var counts = meta.markets || {};
    var lines = [];
    lines.push('交易日 ' + (meta.tradeDate || '—') + ' · 快照 ' + (meta.fetchedAt || '—'));
    if (market) {
      lines.push(
        market.label + ' ' + (market.items ? market.items.length : 0) + ' 只' +
        (market.note ? ' · ' + market.note : '')
      );
    }
    $('meta').innerHTML = lines.join('<br>');
    $('status').textContent =
      '数据源：' + (meta.source || '本地快照') +
      ' · A ' + (counts.a || 0) +
      ' / ETF ' + (counts.etf || 0) +
      ' / 转债 ' + (counts.cb || 0) +
      ' / 港股 ' + (counts.hk || 0) +
      ' · 滚轮缩放，拖拽平移';
  }

  function render() {
    var market = getMarket();
    if (!market) {
      $('chart').innerHTML = '<div class="error">未加载市场数据。请确认 data/*.js 与 index.html 在同一项目目录下。</div>';
      return;
    }
    renderMetrics(market);
    updateMeta();

    var seriesData = buildSeries(market);
    var mid = currentMetricId(market);
    var mlabel = metricLabel(market, mid);

    if (!state.chart) {
      state.chart = echarts.init($('chart'), null, { renderer: 'canvas' });
      window.addEventListener('resize', function () {
        if (state.chart) state.chart.resize();
      });
    }

    state.chart.setOption({
      animation: false,
      tooltip: {
        formatter: function (info) {
          var d = info.data || {};
          var lines = [
            '<b>' + (d.title || '') + '</b> (' + (d.code || '') + ')',
            '涨跌幅：<span style="color:' + (d.pct >= 0 ? '#f87171' : '#4ade80') + '">' + fmtPct(d.pct) + '</span>',
            '最新价：' + (d.price != null ? d.price : '—'),
            mlabel + '：' + (d.scaleYi != null ? d.scaleYi.toFixed(2) + ' 亿' : fmtMoney(d.metricValue)),
          ];
          if (d.stock) lines.push('正股：' + d.stock);
          return lines.join('<br>');
        },
      },
      series: [{
        type: 'treemap',
        roam: true,
        nodeClick: false,
        breadcrumb: { show: false },
        width: '100%',
        height: '100%',
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        label: {
          show: true,
          formatter: function (params) {
            var d = params.data || {};
            var name = d.title || '';
            if (name.length > 6) name = name.slice(0, 6);
            return name + '\n' + fmtPct(d.pct);
          },
          color: '#f8fafc',
          fontSize: 11,
          overflow: 'truncate',
        },
        upperLabel: { show: false },
        itemStyle: {
          borderColor: '#0b0e14',
          borderWidth: 1,
          gapWidth: 1,
        },
        levels: [{
          itemStyle: {
            borderWidth: 0,
            gapWidth: 1,
          },
        }],
        data: seriesData,
      }],
    }, true);
  }

  function bindTabs() {
    var tabs = document.querySelectorAll('.tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var id = tab.dataset.market;
        if (MARKETS.indexOf(id) < 0) return;
        state.market = id;
        state.metric = null;
        tabs.forEach(function (t) {
          t.classList.toggle('active', t === tab);
        });
        render();
      });
    });
  }

  function boot() {
    if (typeof echarts === 'undefined') {
      $('chart').innerHTML = '<div class="error">未能加载 vendor/echarts.min.js。请保持 web/ 目录完整后双击 index.html。</div>';
      return;
    }
    if (!window.CloudData || !window.CloudData.meta) {
      $('chart').innerHTML = '<div class="error">未能加载 data/*.js。file:// 下请勿拆散目录；无需本地服务器。</div>';
      return;
    }
    bindTabs();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
