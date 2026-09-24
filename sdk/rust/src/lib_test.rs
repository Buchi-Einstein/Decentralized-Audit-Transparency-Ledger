#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_client() {
        let client = Client::new("http://example.com").unwrap();
        assert_eq!(client.base_url(), "http://example.com");
    }

    #[test]
    fn test_new_client_invalid_url() {
        let result = Client::new("invalid-url");
        assert!(result.is_err());
    }
}