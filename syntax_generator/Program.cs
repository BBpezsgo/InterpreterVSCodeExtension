using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;

namespace LanguageCore.SyntaxGenerator;

static partial class Program
{
    static void Main()
    {
        Dictionary<string, Pattern> repository = new();

        string builtinTypes = string.Join('|', TypeKeywords.List);
        string keywords = string.Join('|', LanguageConstants.KeywordList);
        string typeExcludedKeywords = string.Join('|', LanguageConstants.KeywordList.Except(TypeKeywords.List));
        string identifier = @$"(?!(?:{keywords})\b)[a-zA-Z_@]+[a-zA-Z0-9_@]*";
        string typeRegex = @$"(?!(?:{typeExcludedKeywords})\b)[a-zA-Z_@]+[a-zA-Z0-9_@\*\[\]\<\>\,\s]*";

        repository["scope"] = new Pattern()
        {
            Begin = "{",
            End = "}",

            Patterns =
            [
                new() { Include = "#comment" },
                new() { Include = "#comment-block" },

                new() { Include = "#attribute" },
                new() { Include = "#keyword" },

                new() { Include = "#any-statement" },
                new() { Include = "#scope" },
            ]
        };

        repository["preprocessor"] = new Pattern()
        {
            Match = @"(#[a-zA-Z]*)\s *([a-zA-Z]*)",
            Captures = new()
            {
                { 1, SyntaxToken.ConstantLanguage },
                { 2, SyntaxToken.EntityNameVariable },
            },
        };

        repository["literal"] = new Pattern()
        {
            Patterns =
            [
                new() { Include = "#strings" },
                new() { Include = "#number" },
            ]
        };

        repository["any-statement"] = new Pattern()
        {
            Patterns =
            [
                new() { Include = "#comment" },
                new() { Include = "#comment-block" },

                new() { Include = "#as" },
                new() { Include = "#flow-control-statement" },
                new() { Include = "#function-call" },
                new() { Include = "#literal" },
                new() { Include = "#hover-popup" },
                new() { Include = "#keyword" },
                new() { Include = "#identifier" }
            ]
        };

        repository["hover-popup"] = new Pattern()
        {
            Match = @"^\(\w+\)",
            Name = "emphasis"
        };

        repository["flow-control-statement"] = new Pattern()
        {
            Match = @$"\b({string.Join('|',
                StatementKeywords.Return,
                StatementKeywords.Crash,
                StatementKeywords.If,
                StatementKeywords.Else,
                StatementKeywords.While,
                StatementKeywords.For,
                StatementKeywords.Break)})\b",
            Captures = new()
            {
                { 1, SyntaxToken.KeywordControl },
            }
        };

        repository["comment"] = new Pattern()
        {
            Match = @"\/\/[^\n]*\n",
            Name = "comment.line"
        };

        repository["comment-block"] = new Pattern()
        {
            Patterns = [
                new()
                {
                    Begin = @"/\*",
                    End = @"\*/",
                    Name = "comment.block",

                    BeginCaptures = new()
                    {
                        { 0, new() { Name = "punctuation.definition.comment.begin.bbc" } }
                    },
                    EndCaptures = new()
                    {
                        { 0, new() { Name = "punctuation.definition.comment.end.bbc" } },
                    }
                },
                new()
                {
                    Match = @"\*/.*\n",
                    Name = "invalid.illegal.stray-comment-end.bbc"
                }
            ]
        };

        repository["number"] = new Pattern()
        {
            Match = @"(\.[0-9]+f?\b|\b[0-9]+f?\b|\b0x[0-9a-fA-F_]+\b|\b0b[01_]+\b|\b[0-9]e[0-9]f?\b)",
            Name = "constant.numeric"
        };

        repository["struct-definition"] = new Pattern()
        {
            Match = @$"({DeclarationKeywords.Struct})[\s]+({identifier})",
            Captures = new()
            {
                { 1, SyntaxToken.KeywordControl },
                { 2, SyntaxToken.EntityNameType },
            }
        };

        repository["alias-definition"] = new Pattern()
        {
            Match = @$"({DeclarationKeywords.Alias})\s+({identifier})\s+",
            Captures = new()
            {
                { 1, SyntaxToken.KeywordControl },
                { 2, SyntaxToken.EntityNameType },
            }
        };

        repository["using"] = new Pattern()
        {
            Match = @$"\b({DeclarationKeywords.Using})\s+([a-zA-Z0-9_\.]+)",
            Captures = new()
            {
                { 1, SyntaxToken.KeywordControl },
                { 2, SyntaxToken.String },
            }
        };

        repository["keyword"] = new Pattern()
        {
            Match = @$"\b({keywords})\b",
            Captures = new()
            {
                { 1, SyntaxToken.KeywordControl },
            }
        };

        repository["function-call"] = new Pattern()
        {
            Match = @$"\b({identifier})\b\s*(?=\()",
            Captures = new()
            {
                { 1, SyntaxToken.EntityNameFunction },
            }
        };

        repository["function-definition"] = new Pattern()
        {
            Patterns = [
                new()
                {
                    Match = @$"(\w+)(?<!{typeExcludedKeywords})\s+({identifier})\s*(?=\()",
                    Captures = new()
                    {
                        { 2, SyntaxToken.EntityNameFunction },
                    }
                },
                new()
                {
                    Match = @$"(\w+)(?<!{typeExcludedKeywords})\s+({identifier})\s*<.*>\s*(?=\()",
                    Captures = new()
                    {
                        { 2, SyntaxToken.EntityNameFunction },
                    }
                },
            ]
        };

        repository["strings"] = new Pattern()
        {
            Patterns = [
                new()
                {
                    Begin = "\"",
                    End = "\"",
                    Name = "string.quoted.double",
                    Patterns =
                    [
                        new() { Include = "#string-escaped-char" }
                    ]
                },
                new()
                {
                    Begin = "'",
                    End = "'",
                    Name = "string.quoted.single",
                    Patterns =
                    [
                        new() { Include = "#string-escaped-char" }
                    ]
                }
            ]
        };

        repository["string-escaped-char"] = new Pattern()
        {
            Patterns =
            [
                new()
                {
                    Match = @"(?x)\\(\\|[ntr\""e]|0|(u[0-9a-fA-F]{4}))",
                    Name = "constant.character.escape"
                },
                new()
                {
                    Match = @"\\(u[0-9a-zA-Z]{4}|.)",
                    Name = "invalid.illegal.unknown-escape.bbc"
                }
            ]
        };

        string json = JsonSerializer.Serialize(new SyntaxFile()
        {
            Schema = "https://raw.githubusercontent.com/martinring/tmlanguage/master/tmlanguage.json",
            Name = "BBLang Language",
            FileTypes = ["bbc"],
            ScopeName = "source.bbc",
            Repository = repository,
            Patterns = [
                new() { Include = "#comment" },
                new() { Include = "#comment-block" },
                new() { Include = "#preprocessor" },
                new() { Include = "#alias-definition" },
                new() { Include = "#struct-definition" },
                new() { Include = "#any-statement" },
                new() { Include = "#function-definition" },
                new() { Include = "#using" },
                new() { Include = "#scope" },
                new() { Include = "#keyword" },
            ]
        }, Converter.JsonOptions);
        File.WriteAllText("/home/bb/Projects/BBLang/VSCodeExtension/syntax/bblang.json", json);
    }
}
