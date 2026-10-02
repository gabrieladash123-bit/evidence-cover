# Synthetic offer: FetchLane

Educational fixture, not a real vendor or service-delivery attestation.

FetchLane retrieves remote data over HTTP. Failed requests are retried with
bounded exponential backoff, and each attempt has an explicit timeout.
Its output is the unparsed response body.

FetchLane does not parse CSV, split records, or handle quoted field delimiters.
