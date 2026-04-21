window.HELP_IMPROVE_VIDEOJS = false;

var INTERP_BASE = "./static/interpolation/stacked";
var NUM_INTERP_FRAMES = 240;

var interp_images = [];
function preloadInterpolationImages() {
  for (var i = 0; i < NUM_INTERP_FRAMES; i++) {
    var path = INTERP_BASE + '/' + String(i).padStart(6, '0') + '.jpg';
    interp_images[i] = new Image();
    interp_images[i].src = path;
  }
}

function setInterpolationImage(i) {
  var image = interp_images[i];
  image.ondragstart = function() { return false; };
  image.oncontextmenu = function() { return false; };
  $('#interpolation-image-wrapper').empty().append(image);
}

var EXPECTED_GAIN_NODES = {
  S: { gain: 0 },
  A: { gain: 16 },
  B: { gain: 10 },
  C: { gain: 18 },
  D: { gain: 22 },
  E: { gain: 14 },
  F1: { gain: 8 },
  F2: { gain: 20 }
};

var EXPECTED_GAIN_EDGE_COSTS = {
  'S-A': 12,
  'S-B': 10,
  'A-C': 14,
  'B-D': 16,
  'B-E': 11,
  'C-F1': 12,
  'E-F2': 15
};

var EXPECTED_GAIN_PATHS = [
  {
    id: 'p1',
    label: 'S-A-C-F1',
    nodes: ['S', 'A', 'C', 'F1'],
    edges: ['S-A', 'A-C', 'C-F1'],
    terminal: 'F1'
  },
  {
    id: 'p2',
    label: 'S-B-D',
    nodes: ['S', 'B', 'D'],
    edges: ['S-B', 'B-D'],
    terminal: 'D'
  },
  {
    id: 'p3',
    label: 'S-B-E-F2',
    nodes: ['S', 'B', 'E', 'F2'],
    edges: ['S-B', 'B-E', 'E-F2'],
    terminal: 'F2'
  }
];

function initializeExpectedGainDemo() {
  var demoRoot = document.getElementById('expected-gain-demo');
  if (!demoRoot) {
    return;
  }

  var slider = document.getElementById('eg-budget-slider');
  var budgetValue = document.getElementById('eg-budget-value');
  var scoreBody = document.getElementById('eg-score-body');
  var bestPath = document.getElementById('eg-best-path');
  var criterionContainer = document.getElementById('eg-criterion-buttons');
  var criterionButtons = criterionContainer ? criterionContainer.querySelectorAll('button[data-criterion]') : [];
  var frontierStatus = { F1: true, F2: true };
  var activeCriterion = 'gain';

  function computeScore(path, budget) {
    var gain = 0;
    var cost = 0;
    var i;

    for (i = 0; i < path.nodes.length; i++) {
      gain += EXPECTED_GAIN_NODES[path.nodes[i]].gain;
    }
    for (i = 0; i < path.edges.length; i++) {
      cost += EXPECTED_GAIN_EDGE_COSTS[path.edges[i]];
    }

    var ratio = cost > 0 ? gain / cost : 0;
    var isFrontierPath = !!frontierStatus[path.terminal];
    var expected = isFrontierPath ? ratio * budget : gain;

    return {
      id: path.id,
      label: path.label,
      gain: gain,
      ratio: ratio,
      expected: expected,
      frontier: isFrontierPath,
      edges: path.edges
    };
  }

  function winnerByCriterion(scores, criterion) {
    var winner = scores[0];
    var i;
    for (i = 1; i < scores.length; i++) {
      if (scores[i][criterion] > winner[criterion]) {
        winner = scores[i];
      }
    }
    return winner;
  }

  function clearActiveEdges() {
    var lines = demoRoot.querySelectorAll('line[id^="eg-edge-"]');
    var i;
    for (i = 0; i < lines.length; i++) {
      lines[i].classList.remove('eg-path-active');
    }
  }

  function highlightPathEdges(path) {
    clearActiveEdges();
    var i;
    for (i = 0; i < path.edges.length; i++) {
      var edge = document.getElementById('eg-edge-' + path.edges[i]);
      if (edge) {
        edge.classList.add('eg-path-active');
      }
    }
  }

  function updateNodeFrontierStyles() {
    var nodes = demoRoot.querySelectorAll('.eg-node[data-node]');
    var i;
    for (i = 0; i < nodes.length; i++) {
      var name = nodes[i].getAttribute('data-node');
      var active = !!frontierStatus[name];
      nodes[i].classList.toggle('eg-frontier-active', active);
    }
  }

  function refreshDemo() {
    var budget = Number(slider.value);
    var scores = EXPECTED_GAIN_PATHS.map(function(path) {
      return computeScore(path, budget);
    });
    var criterionKey = activeCriterion === 'ratio' ? 'ratio' : (activeCriterion === 'expected' ? 'expected' : 'gain');
    var winner = winnerByCriterion(scores, criterionKey);

    budgetValue.textContent = String(budget);
    updateNodeFrontierStyles();
    highlightPathEdges(winner);

    scoreBody.innerHTML = '';
    scores.forEach(function(score) {
      var row = document.createElement('tr');
      if (score.id === winner.id) {
        row.classList.add('is-winner');
      }
      row.innerHTML = '' +
        '<td>' + score.label + (score.frontier ? ' (frontier)' : '') + '</td>' +
        '<td>' + score.gain.toFixed(1) + '</td>' +
        '<td>' + score.ratio.toFixed(2) + '</td>' +
        '<td>' + score.expected.toFixed(1) + '</td>';
      scoreBody.appendChild(row);
    });

    var criterionName = activeCriterion === 'gain'
      ? 'Path Gain'
      : (activeCriterion === 'ratio' ? 'Path Ratio' : 'Expected Gain');
    bestPath.textContent = criterionName + ' currently selects: ' + winner.label;
  }

  if (slider) {
    slider.addEventListener('input', refreshDemo);
  }

  if (criterionButtons.length) {
    criterionButtons.forEach(function(button) {
      button.addEventListener('click', function() {
        activeCriterion = button.getAttribute('data-criterion') || 'gain';
        criterionButtons.forEach(function(other) {
          other.classList.toggle('is-selected', other === button);
          other.classList.toggle('is-info', other === button);
        });
        refreshDemo();
      });
    });
  }

  var frontierNodes = demoRoot.querySelectorAll('.eg-frontier-candidate[data-node]');
  frontierNodes.forEach(function(node) {
    node.addEventListener('click', function() {
      var name = node.getAttribute('data-node');
      frontierStatus[name] = !frontierStatus[name];
      refreshDemo();
    });
  });

  refreshDemo();
}


$(document).ready(function() {
    // Check for click events on the navbar burger icon
    $(".navbar-burger").click(function() {
      // Toggle the "is-active" class on both the "navbar-burger" and the "navbar-menu"
      $(".navbar-burger").toggleClass("is-active");
      $(".navbar-menu").toggleClass("is-active");

    });

    var options = {
			slidesToScroll: 1,
			slidesToShow: 3,
			loop: true,
			infinite: true,
			autoplay: false,
			autoplaySpeed: 3000,
    }

		// Initialize all div with carousel class
    var carousels = bulmaCarousel.attach('.carousel', options);

    // Loop on each carousel initialized
    for(var i = 0; i < carousels.length; i++) {
    	// Add listener to  event
    	carousels[i].on('before:show', state => {
    		console.log(state);
    	});
    }

    // Access to bulmaCarousel instance of an element
    var element = document.querySelector('#my-element');
    if (element && element.bulmaCarousel) {
    	// bulmaCarousel instance is available as element.bulmaCarousel
    	element.bulmaCarousel.on('before-show', function(state) {
    		console.log(state);
    	});
    }

    /*var player = document.getElementById('interpolation-video');
    player.addEventListener('loadedmetadata', function() {
      $('#interpolation-slider').on('input', function(event) {
        console.log(this.value, player.duration);
        player.currentTime = player.duration / 100 * this.value;
      })
    }, false);*/
    preloadInterpolationImages();

    $('#interpolation-slider').on('input', function(event) {
      setInterpolationImage(this.value);
    });
    setInterpolationImage(0);
    $('#interpolation-slider').prop('max', NUM_INTERP_FRAMES - 1);

    initializeExpectedGainDemo();

    bulmaSlider.attach();

})
