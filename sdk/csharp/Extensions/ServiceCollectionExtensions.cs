using System;
using System.Net.Http;
using AuditLedger.SDK;
using Microsoft.Extensions.DependencyInjection;

namespace AuditLedger.SDK.Extensions
{
    /// <summary>
    /// Extension methods for setting up AuditLedger SDK services in an <see cref="IServiceCollection" />.
    /// </summary>
    public static class ServiceCollectionExtensions
    {
        /// <summary>
        /// Registers <see cref="IAuditLedgerClient"/> and <see cref="AuditLedgerClient"/> with configured options.
        /// </summary>
        public static IServiceCollection AddAuditLedger(this IServiceCollection services, Action<AuditLedgerOptions> configureOptions)
        {
            if (services == null) throw new ArgumentNullException(nameof(services));
            if (configureOptions == null) throw new ArgumentNullException(nameof(configureOptions));

            var options = new AuditLedgerOptions();
            configureOptions(options);

            services.AddSingleton(options);
            services.AddHttpClient<IAuditLedgerClient, AuditLedgerClient>((sp, client) =>
            {
                var opts = sp.GetRequiredService<AuditLedgerOptions>();
                var baseUri = new Uri(opts.BaseUrl.EndsWith("/") ? opts.BaseUrl : opts.BaseUrl + "/");
                client.BaseAddress = baseUri;
                client.Timeout = TimeSpan.FromSeconds(opts.TimeoutSeconds);
            });

            return services;
        }

        /// <summary>
        /// Registers <see cref="IAuditLedgerClient"/> using existing options instance.
        /// </summary>
        public static IServiceCollection AddAuditLedger(this IServiceCollection services, AuditLedgerOptions options)
        {
            if (services == null) throw new ArgumentNullException(nameof(services));
            if (options == null) throw new ArgumentNullException(nameof(options));

            services.AddSingleton(options);
            services.AddSingleton<IAuditLedgerClient>(sp =>
            {
                return new AuditLedgerClient(options);
            });

            return services;
        }
    }
}
