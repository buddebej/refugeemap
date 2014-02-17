module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
      dist: {
        src: ['src/Mapugee.js', 'data/names.js', 'src/MapugeeChart.js', 'src/initUi.js', 'src/initMap.js'],
        dest: 'build/temp-concat.js'
      },
      // zweiter concat durchgang damit die libs nicht nochmal minified werden
      lib: {
        src: ['src/lib/jquery.min.js', 'src/lib/jquery-ui.min.js', 'src/lib/topojson.min.js', 'src/lib/d3.min.js', 'build/mapugee.min.js'],
        dest: 'build/mapugee.min.js'
      }
    },
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      build: {
        src: 'build/temp-concat.js',
        dest: 'build/mapugee.min.js'
      }
    },
    copy: {
      main: {
        files: [
          // includes files within path
          {
            expand: false,
            src: 'build/mapugee.min.js',
            dest: 'js/mapugee.min.js'
          }, {
            expand: false,
            src: ['css/**', 'js/**', 'data/**', 'img/**', 'index.html'],
            dest: 'build/dist/'
          }
        ]
      }
    }
  });


  // Load the plugin that provides the 'uglify' task.
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');

  grunt.log.write('Logging some stuff...').ok();


  // Default task(s).
  grunt.registerTask('default', ['concat', 'uglify', 'concat:lib', 'copy']);

};