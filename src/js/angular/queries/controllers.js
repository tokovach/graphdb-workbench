import 'angular/core/services';

const queriesCtrl = angular.module('graphdb.framework.jmx.queries.controllers', [
    'ui.bootstrap',
    'toastr'
]);

queriesCtrl.controller('QueriesCtrl', ['$scope', '$http', '$modal', 'toastr', '$interval', '$repositories', '$jwtAuth', 'ModalService',
    function ($scope, $http, $modal, toastr, $interval, $repositories, $jwtAuth, ModalService) {

        $scope.loader = true;
        $scope.stringLimit = 500;
        $scope.expanded = {};
        $scope.jolokiaError = '';

        function containsIPV4(ip) {
            const blocks = ip.split('.');
            for (let i = 0, sequence = 0; i < blocks.length; i++) {
                if (parseInt(blocks[i], 10) >= 0 && parseInt(blocks[i], 10) <= 255) {
                    sequence++;
                } else {
                    sequence = 0;
                }
                if (sequence === 4) {
                    return true;
                }
            }
            return false;
        }

        const parser = document.createElement('a');

        $scope.parseTrackId = function (trackId) {
            if (trackId.indexOf('#') < 0) {
                return [trackId, '', $repositories.getActiveRepository()];
            }

            let shortUrl = 'local';
            if (trackId.indexOf('://localhost:') < 0 && trackId.indexOf('://localhost/') < 0) {
                parser.href = trackId;
                let hostname = parser.hostname;
                if (!containsIPV4(parser.hostname)) {
                    hostname = parser.hostname.split('.')[0];
                }
                shortUrl = hostname + ':' + parser.port;
            }
            const match = trackId.match(/\/repositories\/([^\/]+)#(\d+)/); // eslint-disable-line no-useless-escape

            return [match[2], shortUrl, match[1]];
        };

        $scope.getQueries = function () {
            // Skip execution if already getting from previous call, if paused, if jolokia returned an error,
            // or if no repository is available
            if ($scope.getQueriesRunning || $scope.paused || $scope.jolokiaError || !$repositories.getActiveRepository()) {
                return;
            }

            $scope.getQueriesRunning = true;
            $http.get('rest/monitor/query').success(function (data) {
                const newQueries = data;
                $scope.noQueries = newQueries.length === 0;

                // Converts array to object. Angular seems to handle updates on objects better, i.e.
                // it doesn't recreate DOM elements for queries that are already displayed.
                $scope.queries = {};
                for (let i = 0; i < newQueries.length; i++) {
                    newQueries[i].compositeTrackId = $scope.parseTrackId(newQueries[i].trackId);
                    $scope.queries[newQueries[i].trackId] = newQueries[i];
                }

                $scope.noActiveRepository = false;
                $scope.loader = false;
                $scope.getQueriesRunning = false;
            }).error(function (data) {
                $scope.jolokiaError = getError(data);
                $scope.loader = false;
                $scope.getQueriesRunning = false;
            });
        };

        const timer = $interval(function () {
            $scope.getQueries();
        }, 1000);

        $scope.$on('$destroy', function () {
            $interval.cancel(timer);
        });

        $scope.deleteQueryHttp = function (queryId) {

            $scope.loader = true;
            $http.delete('rest/monitor/query?queryId=' + encodeURIComponent(queryId)).success(function () {
                toastr.success('Abort request sent.');
                $scope.loader = false;
            }).error(function (data) {
                const msg = getError(data);
                toastr.error(msg, 'Error');

                $scope.loader = false;
            });
        };

        $scope.abortQuery = function (queryId) {
            ModalService.openSimpleModal({
                title: 'Confirm abort',
                message: 'Are you sure you want to abort the query?',
                warning: true
            }).result.then(function () {
                $scope.deleteQueryHttp(queryId);
            });
        };

        $scope.downloadQuery = function (queryId) {
            const parsed = $scope.parseTrackId(queryId);
            let filename = 'query_' + parsed[0] + '_' + parsed[2];
            if (parsed[1]) {
                filename += '_' + parsed[1];
            }
            filename += '.rq';
            let link = 'rest/monitor/query/download?queryId=' + encodeURIComponent(queryId)
                + '&repository=' + encodeURIComponent($repositories.getActiveRepository())
                + '&filename=' + encodeURIComponent(filename);
            if ($jwtAuth.isAuthenticated()) {
                link = link + '&authToken=' + encodeURIComponent($jwtAuth.getAuthToken());
            }

            window.open(link, '_blank');
        };

        $scope.toggleQueryExpanded = function (queryId) {
            $scope.expanded[queryId] = !$scope.expanded[queryId];
        };
    }]);


queriesCtrl.controller('DeleteQueryCtrl', ['$scope', '$modalInstance', function ($scope, $modalInstance) {

    $scope.ok = function () {
        $modalInstance.close();
    };

    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };
}]);
