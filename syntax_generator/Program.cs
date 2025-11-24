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

        repository["hash"] = new Pattern()
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
                new() { Include = "#variable-definition" },
                new() { Include = "#new-instance" },
                new() { Include = "#sizeof" },
                new() { Include = "#function-call" },
                new() { Include = "#literal" },
                new() { Include = "#hover-popup" },
                new() { Include = "#keyword" },
                new() { Include = "#field" },
                new() { Include = "#type" },
                new() { Include = "#identifier" }
            ]
        };

        repository["sizeof"] = new Pattern()
        {
            Begin = @"\b(sizeof)\s*\(",
            End = @"\)",

            BeginCaptures = new()
            {
                { 1, SyntaxToken.KeywordControl },
            },

            Patterns = [
                new() { Include = "#type" },
                new()
                {
                    Match = @"\b(\w+)\b",
                    Captures = new()
                    {
                        { 1, SyntaxToken.EntityNameType },
                    }
                }
            ]
        };

        repository["as"] = new Pattern()
        {
            Match = @$"\b({StatementKeywords.As})\b\s+({typeRegex})\b",
            Captures = new()
            {
                { 1, SyntaxToken.KeywordControl },
                { 2, new() { Patterns = [ new() { Include = "#type" } ] } },
            }
        };

        repository["type"] = new Pattern()
        {
            Patterns = [
                new()
                {
                    Match = @$"\b({identifier})\b[\t ]*<({typeRegex})>",
                    Captures = new() {
                        { 1, SyntaxToken.EntityNameType },
                        { 2, new() { Patterns = [ new() { Include = "#type" } ] } },
                    },
                },
                new()
                {
                    Match = @$"\b({builtinTypes})\b",
                    Captures = new() {
                        { 1, SyntaxToken.KeywordControl },
                    },
                },
                new()
                {
                    Match = @$"\b({identifier})\b(\*+)",
                    Captures = new() {
                        { 1, SyntaxToken.EntityNameType },
                    },
                },
            ],
        };

        repository["hover-popup"] = new Pattern()
        {
            Match = @"^\(\w+\)",
            Name = "emphasis"
        };

        repository["flow-control-statement"] = new Pattern()
        {
            Patterns = [
                new()
                {
                    Match = @$"\b{StatementKeywords.Return}\b",
                    Name = "keyword.control",
                },
                new()
                {
                    Match = @$"\b{StatementKeywords.Crash}\b",
                    Name = "keyword.control",
                },
                new()
                {
                    Match = @$"\b{StatementKeywords.If}\b",
                    Name = "keyword.control",
                },
                new()
                {
                    Match = @$"\b{StatementKeywords.ElseIf}\b",
                    Name = "keyword.control",
                },
                new()
                {
                    Match = @$"\b{StatementKeywords.Else}\b",
                    Name = "keyword.control",
                },
                new()
                {
                    Match = @$"\b{StatementKeywords.While}\b",
                    Name = "keyword.control",
                },
                new()
                {
                    Match = @$"\b{StatementKeywords.For}\b",
                    Name = "keyword.control",
                },
                new()
                {
                    Match = @$"\b{StatementKeywords.Break}\b",
                    Name = "keyword.control",
                },
            ]
        };

        repository["keyword-call"] = new Pattern()
        {
            Match = @"\b(delete|temp|type)\b",
            Captures = new()
            {
                {1, SyntaxToken.EntityNameTag },
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

        /*
        repository["field"] = new Pattern()
        {
            Match = @$"\.\w*\b({identifier})\b(?!\s*\()"
        };
        */

        /*
        repository["identifier"] = new Pattern()
        {
            Match = @$"\b({identifier})\b(?!\s*\()",
            Captures = new()
            {
                { 1, SyntaxToken.VariableName }
            }
        };
        */

        repository["string"] = new Pattern()
        {
            Name = "string.quoted.double.ulog",
            Match = @"""[\s\S]*"""
        };

        repository["struct-definition"] = new Pattern()
        {
            Match = @$"({DeclarationKeywords.Struct})[\s]+({identifier})",
            Captures = new()
            {
                { 1, SyntaxToken.KeywordControl },
                { 2, SyntaxToken.EntityNameClass },
            }
        };

        repository["alias-definition"] = new Pattern()
        {
            Match = @$"({DeclarationKeywords.Alias})\s+({identifier})\s+({typeRegex})\b",
            Captures = new()
            {
                { 1, SyntaxToken.KeywordControl },
                { 2, SyntaxToken.EntityNameClass },
                { 3, new() { Patterns = [ new() { Include = "#type" } ] } },
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

        /*
        repository["new-instance"] = new Pattern()
        {
            Match = @$"({StatementKeywords.New})[\s]+({typeRegex})\b",
            Captures = new()
            {
                { 1, SyntaxToken.EntityNameTag },
                { 2, new() { Patterns = [ new() { Include = "#type" } ] } },
            }
        };

        repository["variable-definition"] = new Pattern()
        {
            Patterns = [
                new()
                {
                    Match = @$"\b({builtinTypes})\b\s+((?!(?:{builtinTypes}))\w+)(?!\()",
                    Captures = new()
                    {
                        { 1,SyntaxToken.EntityNameTag },
                        { 2, SyntaxToken.EntityNameVariable },
                    }
                },
                new()
                {
                    Match = @$"\b([\w*<>]+)(?<!{typeExcludedKeywords})[\t ]+\b(?!as)(\w+)(?!\()",
                    Captures = new()
                    {
                        {
                            1,
                            new()
                            {
                                Patterns =
                                [
                                    new() { Include = "#type" },
                                    new()
                                    {
                                        Match = @"\b(\w+)\b",
                                        Captures = new()
                                        {
                                            { 1, SyntaxToken.EntityNameType }
                                        }
                                    },
                                ]
                            }
                        },
                        { 2, SyntaxToken.EntityNameVariable },
                    }
                }
            ]
        };
        */

        repository["attribute"] = new Pattern()
        {
            Match = @$"\s\[\s*({identifier})\s*(\]|\()",
            Captures = new()
            {
                { 1, SyntaxToken.EntityNameClass },
            }
        };

        repository["keyword"] = new Pattern()
        {
            Patterns =
            [
                new()
                {
                    Match = @$"\b({keywords})\b",
                    Captures = new()
                    {
                        { 1, SyntaxToken.KeywordControl },
                    }
                },
                new()
                {
                    Match = @"\b(export)\b",
                    Captures = new()
                    {
                        { 1, SyntaxToken.KeywordControl },
                    }
                }
            ]
        };

        repository["function-call"] = new Pattern()
        {
            Match = @$"(?<!\[)\b({identifier})\b\s*(?=\()",
            Captures = new()
            {
                { 1, SyntaxToken.EntityNameFunction },
            }
        };

        repository["function-definition"] = new Pattern()
        {
            Match = @$"(\w+)(?<!{typeExcludedKeywords})\s+({identifier})\s?\(([\w\s,]?)\)",
            Captures = new()
            {
                { 1, new() { Patterns = [ new() { Include = "#type" } ] } },
                { 2, SyntaxToken.EntityNameFunction },
                { 3, new() { Patterns = [ new() { Include = "#parameter-definitions" } ] } },
            }
        };

        repository["parameter-definitions"] = new Pattern()
        {
            Match = @$"((this|ref|temp)*\s+)?([\w]+)\s+({identifier})(,|$)",
            Captures = new()
            {
                { 1, new() { Patterns = [ new() { Include = "#keyword" } ] } },
                { 2, new() { Patterns = [ new() { Include = "#type" } ] } },
                { 3, SyntaxToken.VariableParameter },
            }
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

                new() { Include = "#hash" },
                new() { Include = "#alias-definition" },
                new() { Include = "#struct-definition" },
                new() { Include = "#enum-definition" },
                new() { Include = "#function-definition" },
                new() { Include = "#using" },

                new() { Include = "#attribute" },
                new() { Include = "#keyword" },

                new() { Include = "#any-statement" },
                new() { Include = "#scope" }
            ]
        }, Converter.JsonOptions);
        File.WriteAllText("/home/BB/Projects/BBLang/VSCodeExtension/syntax/bblang.json", json);
    }
}
