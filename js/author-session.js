/* Shared authoring request lifetime. Does not authorize users or replace RLS. */
(function () {
  'use strict';
  function create(fetchImpl) {
    var account = null, invalid = false;
    var pending = new Set();
    function failure(uncertain) {
      var error = new Error(uncertain ? 'Account changed; the write was not confirmed. Verify the original record before retrying.' : 'Account changed. Reload the author workspace.');
      error.code = uncertain ? 'writer_save_uncertain' : 'author_session_changed';
      return error;
    }
    return {
      bind: function (id) {
        if (invalid || (account && account !== id)) throw failure(false);
        account = id;
      },
      invalidate: function () {
        invalid = true;
        pending.forEach(function (controller) { controller.abort(); });
        pending.clear();
      },
      fetch: async function (input, init) {
        if (invalid) throw failure(false);
        var options = init || {};
        var method = String(options.method || (input && input.method) || 'GET').toUpperCase();
        var write = !['GET','HEAD','OPTIONS'].includes(method);
        var controller = new AbortController();
        var signal = options.signal || (input && input.signal);
        var abort = function () { controller.abort(); };
        if (signal) { if (signal.aborted) controller.abort(); else signal.addEventListener('abort', abort, {once:true}); }
        pending.add(controller);
        try {
          var response = await fetchImpl(input, Object.assign({}, options, {signal:controller.signal}));
          if (invalid) throw failure(write);
          return response;
        } catch (error) {
          if (invalid) throw failure(write);
          throw error;
        } finally {
          pending.delete(controller);
          if (signal) signal.removeEventListener('abort', abort);
        }
      }
    };
  }
  window.AuthorSession = create(function (input, init) { return window.fetch(input, init); });
  window.AuthorSession.create = create;
}());
