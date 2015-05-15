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
    };
  }

  var characters = [];
  var MAXIMUM_COST_FOR_MATCH_THRESHOLD = 32;

  function recognisePoints(inputStrokes) {
    // break up input strokes into sections
    //TODO for now assume that every point is a section
    //in future use a basis of length as a fraction of total length of strokes
    var inputStrokeDirections = inputStrokes.map(function(inputStroke) {
      var angles = [];
      for (var i = 1; i < inputStroke.xs.length; ++i) {
        var x1 = inputStroke.xs[i-1];
        var y1 = inputStroke.ys[i-1];
        var x2 = inputStroke.xs[i];
        var y2 = inputStroke.ys[i];
        // calculate the angle for each section
        var angle = Math.atan2((y2 - y1), (x2 - x1));
        angles.push(angle);
      }

      // assign each sections' direction to the nearest matching sixteen point section
      var directions = angles.map(function(angle) {
        var degrees = ((0 - angle) + Math.PI) / (2 * Math.PI) * 360;
        var direction = Math.round((degrees / 16) - 0.5 + 16) % 16;
        return direction;
      });

      return directions;
    });

    // iterate over each registered character where the number of strokes is the same
    var costs = characters.map(function(char) {
      var cost = calculateCost(inputStrokeDirections, char.strokes);
      // use a cost function to determine how close/ far the input strokes match this character
      return {
        character: char,
        cost: cost,
      }
    });

    // find the character whose cost is the lowest below a minimum threshold
    var sortedCosts = costs.sort(function (a, b) {
      return a.cost - b.cost;
    });

    if (sortedCosts[0].cost <= MAXIMUM_COST_FOR_MATCH_THRESHOLD) {
      return sortedCosts[0];
    }
    else {
      return undefined;
    }
  }

  function calculateCost(inputStrokeDirections, matchStrokeDirections) {
    //TODO implement me
    return 32767;
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
            return parseInt(char, 16);
          });
      });
    return {
      name: name,
      strokes: strokes,
    };
  }

})();

