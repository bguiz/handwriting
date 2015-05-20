'use strict';

var handwriting = require('../index');

describe('[angle-levenshtein]', function() {
  var instance = handwriting();

  describe('[angle-difference]', function() {

    it('Should calculate the correct angle difference', function(done) {
      expect(instance.angleDifference(350, 10)).toEqual(20);
      expect(instance.angleDifference(10, 350)).toEqual(20);

      expect(instance.angleDifference(180, 180)).toEqual(0);

      expect(instance.angleDifference(0, 360)).toEqual(0);
      expect(instance.angleDifference(360, 0)).toEqual(0);

      expect(instance.angleDifference(90, 270)).toEqual(180);
      expect(instance.angleDifference(270, 90)).toEqual(180);
      done();
    });
  });

  describe('[cost-matrix]', function() {

    it('Should create a matrix for angle levenshtein distance', function(done) {
      var input = [100, 100];
      var match = [100, 100];

      var matrix;

      expect(function() {
        matrix = instance.angleLevenshteinCost(input, match);
      }).not.toThrow();

      expect(matrix.length).toEqual(3);
      expect(matrix[0].length).toEqual(3);

      // The diagonal cost should always be zero throughout,
      // since the input and match are identical
      for (var i = 0; i < 2; ++i) {
        expect(matrix[i][i]).toEqual(0);
      }

      // The final result should be zero too,
      // since the input and the match are identical
      expect(matrix[2][2]).toEqual(0);

      expect(matrix).toEqual([
        [0, 180, 360],
        [180, 0, 180],
        [360, 180, 0]
      ]);

      done();
    });

    it('Should create a matrix for angle levenshtein distance when input and match are of different lengths', function(done) {
      var input = [100, 100, 100, 100];
      var match = [100, 100];

      var matrix;

      expect(function() {
        matrix = instance.angleLevenshteinCost(input, match);
      }).not.toThrow();

      expect(matrix.length).toEqual(3);
      expect(matrix[0].length).toEqual(5);

      // The diagonal cost should always be zero,
      // since the input and match are identical where they intersect
      for (var i = 0; i < 3; ++i) {
        expect(matrix[i][i]).toEqual(0);
      }

      // The final result should be zero,
      // since the insertions that match the previous one come at no cost
      expect(matrix[2][4]).toEqual(0);

      expect(matrix).toEqual([
        [0, 180, 360, 540, 720],
        [180, 0, 180, 180, 180],
        [360, 180, 0, 0, 0]
      ]);

      done();
    });
  });
});
