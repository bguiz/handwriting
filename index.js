(function HandwritingSetup() {
  'use strict';

  // Export as AMD/ CommonJs/ `window` variable
  if (typeof define === 'function' && define.amd) {
    define(function() { return Handwriting; });
  }
  else if (typeof module !== 'undefined') {
    module.exports = Handwriting;
  }
  else if (typeof self !== 'undefined') {
    self.Handwriting = Handwriting;
  }
  else {
    window.Handwriting = Handwriting;
  }

  function Handwriting() {
    registerCharacters();

    return {
      recognisePoints: recognisePoints,
      angleDifference: angleDifference,
      angleLevenshteinCost: angleLevenshteinCost,
    };
  }

  var characters = [];
  var MAXIMUM_COST_FOR_MATCH_THRESHOLD = 1200;

  function recognisePoints(inputStrokes) {
    // break up input strokes into sections
    //TODO for now assume that every point is a section
    //in future use a basis of length as a fraction of total length of strokes
    var inputStrokeAngles = inputStrokes.map(function(inputStroke) {
      var angles = [];
      for (var i = 1; i < inputStroke.xs.length; ++i) {
        var x1 = inputStroke.xs[i-1];
        var y1 = inputStroke.ys[i-1];
        var x2 = inputStroke.xs[i];
        var y2 = inputStroke.ys[i];

        // calculate the angle for each section
        var angle = Math.atan2((y2 - y1), (x2 - x1));
        // convert to clockwise degrees starting from north
        var degrees  = (Math.round(angle / (2 * Math.PI) * 360) + 450) % 360;
        angles.push(degrees);
      }

      return angles;
    });

    // iterate over each registered character where the number of strokes is the same
    var costs = characters
    .filter(function(char) {
      return (char.strokes.length === inputStrokeAngles.length);
    })
    .map(function(char) {
      var cost = calculateCost(inputStrokeAngles, char.strokes);
      // use a cost function to determine how close/ far the input strokes match this character
      return {
        character: char,
        cost: cost,
      };
    });

    // find the character whose cost is the lowest below a minimum threshold
    var sortedCosts = costs.sort(function (a, b) {
      return a.cost - b.cost;
    });

    console.log('sortedCosts', sortedCosts);

    if (sortedCosts[0].cost <= MAXIMUM_COST_FOR_MATCH_THRESHOLD) {
      return sortedCosts[0];
    }
    else {
      return undefined;
    }
  }

  function calculateCost(inputStrokeAngles, matchStrokeAngles) {
    var levenshteinCost = angleLevenshteinMultistrokeCost(inputStrokeAngles, matchStrokeAngles);
    //NOTE cost could be calculatated using multiple algorithms,
    // and their aggregate used. At the moment only one algorithm is used.
    return levenshteinCost;
  }

  function angleLevenshteinMultistrokeCost(inputStrokeAngles, matchStrokeAngles) {
    if (inputStrokeAngles.length !== matchStrokeAngles.length) {
      throw new Error('Input must have a same number of strokes as match');
    }
    var cost = 0;
    for (var i = 0; i < inputStrokeAngles.length; ++i)  {
      var matrix =
        angleLevenshteinCost(inputStrokeAngles[i], matchStrokeAngles[i]);
      cost += matrix[matchStrokeAngles[i].length][inputStrokeAngles[i].length];
    }
    return cost;
  }

  /**
   * Works out the Levenshtein distance between two array of numbers.
   * This custom Levenshtein implementation works with array in degrees (0 to 360 only)
   * And the cost **is not** uniform, but rather calculated based on minimum angle differences.
   * The weights of the substitution, insertion, and deletion are based upon
   * the difference to the current angle (substitution),
   * or the difference with the previous angle (insertion and deletion).
   *
   * @param  {Array<Number>} input An array of numbers between 0-360
   * @param  {Array<Number>} match An array of numbers between 0-360
   * @return {Number}        The minimum total cost of
   *   substitutions, additions, and deletions to get from input to match
   */
  function angleLevenshteinCost(input, match) {
    var maxCost = (input.length + match.length) * 180;

    // Shortcut for empty strings
    if ((input.length === 0 || match.length === 0)) {
      return [[maxCost]];
    }

    // Construct and initialise the matrix
    var x, y;
    var matrix = new Array(match.length + 1);
    for (x = 0; x <= match.length; ++x) {
      matrix[x] = new Array(input.length + 1);
      matrix[x][0] = x * 180;
    }
    for (y = 1; y <= input.length; ++y) {
      matrix[0][y] = y * 180;
    }
    matrix[0][0] = 0;

    // Traverse every cell in the array - dynamic programming style -
    // each result depends upon the previous results (one above, one to the left, and one to the above-left)
    for (x = 0; x < match.length; ++x) {
      for (y = 0; y < input.length; ++y) {
        if (input[x] === match[y]) {
          // Next cost is the same as the current cost
          // This branch is not mathematically necessary, strictly speaking,
          // as the substitution cost will be zero and thus the least in the `else` branch.
          // However, this is included as a performance optimisation.
          matrix[x+1][y+1] = matrix[x][y];
        }
        else {
          // Next cost is not the same as the current cost -
          // work out what the minimum cost is between substitution, insertion, and deletion
          var aboveLeft = matrix[x][y];
          var above = matrix[x][y+1];
          var left = matrix[x+1][y];

          var cost =
            angleDifference(match[x], input[y]) +
            Math.min(aboveLeft, Math.min(above, left));
          matrix[x+1][y+1] = cost;
        }
      }
    }

    console.log('input.length', input.length, 'match.length', match.length);
    console.log(matrixToString(matrix));

    return matrix;
  }

  /**
   * Pretty prints a two dimensional matrix
   * @param  {[type]} matrix [description]
   * @return {[type]}        [description]
   */
  function matrixToString(matrix, width) {
    width = (!!width && width > 0) ? width : 12;
    var str = '';
    var x, y;
    for (x = 0; x < matrix.length; ++x) {
      for (y = 0; y < matrix[x].length; ++y) {
        var little = '('+x+','+y+')' + matrix[x][y];
        str += little + ', ';
        for (var i = 0; i < (width - little.length); ++i) {
          str += ' ';
        }
      }
      str += '\n';
    }
    return str;
  }

  /**
   * Calculates the smallest difference between two angles in degrees
   *
   * For example, the difference between 340 degrees and 10 degrees is
   * 20 degrees (not 340, which a simple subtraction would have yielded)
   *
   * The order of the angles supplied as input parameters does not matter.
   *
   * @param  {Number} angle1 In degrees
   * @param  {Number} angle2 In degrees
   * @return {Number}        Smallest difference between two angles in degrees
   */
  function angleDifference(angle1, angle2) {
    return 180 - Math.abs(Math.abs(angle2 - angle1) - 180) % 360;
  }

  function registerCharacters() {
    characters.push(Character('scribble-1', '44AA44AA44'));
    characters.push(Character('scribble-2', '44BB44BB44'));

    characters.push(Character('A-1', '99|77|4'));
    characters.push(Character('B-1', '88888|468AB568AC'));
    characters.push(Character('C-1', 'CBA987654'));
    // ,,,
    characters.push(Character('X-1', '66|AA'));
    characters.push(Character('Y-1', '66|AA88'));
    characters.push(Character('Z-1', '44AA44'));
  }

  /**
   * Processes a string of characters to describe the parts of a stroke,
   * or several strokes, that make up the constituent vectors in a written character
   *
   * @param {String} name The unique name for this character
   * @param {String} charStr A string consisting of several strokes, separated by `|`
   * Each character in a stroke is a hexadecimal digit - `0123456789ABCDEF` -
   * that corresponds to a direction in a sixteen point compass.
   * For example `X` is `66|AA`, and `Z` is `44AA44`
   *
   * E  F  0  1  2
   *
   * D  \  |  /  3
   *
   * C  -  o  -  4
   *
   * B  /  |  \  5
   *
   * A  9  8  7  6
   */
  function Character(name, charStr) {
    if (typeof charStr !== 'string') {
      throw new Error('Expected charStr input');
    }
    var strokes = charStr.split('|')
      .map(function(strokeStr) {
        return strokeStr.split('')
          .map(function(char) {
            var direction = parseInt(char, 16);
            var degrees = Math.round(direction * 360  / 16);
            return degrees;
          });
      });
    return {
      name: name,
      strokes: strokes,
    };
  }

})();

