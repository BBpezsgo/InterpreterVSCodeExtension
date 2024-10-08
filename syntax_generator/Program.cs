using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;

namespace LanguageCore.SyntaxGenerator;

static class Program
{
    static class SyntaxToken
    {
        public static readonly Pattern Comment = new() { Name = "comment" };
        public static readonly Pattern CommentBlock = new() { Name = "comment.block" };
        public static readonly Pattern CommentBlockDocumentation = new() { Name = "comment.block.documentation" };
        public static readonly Pattern CommentLine = new() { Name = "comment.line" };
        public static readonly Pattern CommentLineDoubleDash = new() { Name = "comment.line.double-dash" };
        public static readonly Pattern CommentLineDoubleSlash = new() { Name = "comment.line.double-slash" };
        public static readonly Pattern CommentLineNumberSign = new() { Name = "comment.line.number-sign" };
        public static readonly Pattern CommentLinePercentage = new() { Name = "comment.line.percentage" };
        public static readonly Pattern Constant = new() { Name = "constant" };
        public static readonly Pattern ConstantCharacter = new() { Name = "constant.character" };
        public static readonly Pattern ConstantCharacterEscape = new() { Name = "constant.character.escape" };
        public static readonly Pattern ConstantLanguage = new() { Name = "constant.language" };
        public static readonly Pattern ConstantNumeric = new() { Name = "constant.numeric" };
        public static readonly Pattern ConstantOther = new() { Name = "constant.other" };
        public static readonly Pattern ConstantRegexp = new() { Name = "constant.regexp" };
        public static readonly Pattern ConstantRgbValue = new() { Name = "constant.rgb-value" };
        public static readonly Pattern ConstantShaGitRebase = new() { Name = "constant.sha.git-rebase" };
        public static readonly Pattern Emphasis = new() { Name = "emphasis" };
        public static readonly Pattern Entity = new() { Name = "entity" };
        public static readonly Pattern EntityName = new() { Name = "entity.name" };
        public static readonly Pattern EntityNameClass = new() { Name = "entity.name.class" };
        public static readonly Pattern EntityNameFunction = new() { Name = "entity.name.function" };
        public static readonly Pattern EntityNameMethod = new() { Name = "entity.name.method" };
        public static readonly Pattern EntityNameSection = new() { Name = "entity.name.section" };
        public static readonly Pattern EntityNameSelector = new() { Name = "entity.name.selector" };
        public static readonly Pattern EntityNameTag = new() { Name = "entity.name.tag" };
        public static readonly Pattern EntityNameType = new() { Name = "entity.name.type" };
        public static readonly Pattern EntityNameVariable = new() { Name = "entity.name.variable" };
        public static readonly Pattern EntityOther = new() { Name = "entity.other" };
        public static readonly Pattern EntityOtherAttributeName = new() { Name = "entity.other.attribute-name" };
        public static readonly Pattern EntityOtherInheritedClass = new() { Name = "entity.other.inherited-class" };
        public static readonly Pattern Header = new() { Name = "header" };
        public static readonly Pattern Invalid = new() { Name = "invalid" };
        public static readonly Pattern InvalidDeprecated = new() { Name = "invalid.deprecated" };
        public static readonly Pattern InvalidIllegal = new() { Name = "invalid.illegal" };
        public static readonly Pattern Keyword = new() { Name = "keyword" };
        public static readonly Pattern KeywordControl = new() { Name = "keyword.control" };
        public static readonly Pattern KeywordControlLess = new() { Name = "keyword.control.less" };
        public static readonly Pattern KeywordOperator = new() { Name = "keyword.operator" };
        public static readonly Pattern KeywordOperatorNew = new() { Name = "keyword.operator.new" };
        public static readonly Pattern KeywordOther = new() { Name = "keyword.other" };
        public static readonly Pattern KeywordOtherUnit = new() { Name = "keyword.other.unit" };
        public static readonly Pattern Markup = new() { Name = "markup" };
        public static readonly Pattern MarkupBold = new() { Name = "markup.bold" };
        public static readonly Pattern MarkupChanged = new() { Name = "markup.changed" };
        public static readonly Pattern MarkupDeleted = new() { Name = "markup.deleted" };
        public static readonly Pattern MarkupHeading = new() { Name = "markup.heading" };
        public static readonly Pattern MarkupInlineRaw = new() { Name = "markup.inline.raw" };
        public static readonly Pattern MarkupInserted = new() { Name = "markup.inserted" };
        public static readonly Pattern MarkupItalic = new() { Name = "markup.italic" };
        public static readonly Pattern MarkupList = new() { Name = "markup.list" };
        public static readonly Pattern MarkupListNumbered = new() { Name = "markup.list.numbered" };
        public static readonly Pattern MarkupListNnnumbered = new() { Name = "markup.list.unnumbered" };
        public static readonly Pattern MarkupOther = new() { Name = "markup.other" };
        public static readonly Pattern MarkupPunctuationListBeginning = new() { Name = "markup.punctuation.list.beginning" };
        public static readonly Pattern MarkupPunctuationQuoteBeginning = new() { Name = "markup.punctuation.quote.beginning" };
        public static readonly Pattern MarkupQuote = new() { Name = "markup.quote" };
        public static readonly Pattern MarkupRaw = new() { Name = "markup.raw" };
        public static readonly Pattern MarkupUnderline = new() { Name = "markup.underline" };
        public static readonly Pattern MarkupUnderlineLink = new() { Name = "markup.underline.link" };
        public static readonly Pattern Meta = new() { Name = "meta" };
        public static readonly Pattern MetaCast = new() { Name = "meta.cast" };
        public static readonly Pattern MetaParameterTypeVariable = new() { Name = "meta.parameter.type.variable" };
        public static readonly Pattern MetaPreprocessor = new() { Name = "meta.preprocessor" };
        public static readonly Pattern MetaPreprocessorNumeric = new() { Name = "meta.preprocessor.numeric" };
        public static readonly Pattern MetaPreprocessorString = new() { Name = "meta.preprocessor.string" };
        public static readonly Pattern MetaReturnType = new() { Name = "meta.return-type" };
        public static readonly Pattern MetaSelector = new() { Name = "meta.selector" };
        public static readonly Pattern MetaStructureDictionaryKeyPython = new() { Name = "meta.structure.dictionary.key.python" };
        public static readonly Pattern MetaTag = new() { Name = "meta.tag" };
        public static readonly Pattern MetaTypeAnnotation = new() { Name = "meta.type.annotation" };
        public static readonly Pattern MetaTypeName = new() { Name = "meta.type.name" };
        public static readonly Pattern MetatagPhp = new() { Name = "metatag.php" };
        public static readonly Pattern Storage = new() { Name = "storage" };
        public static readonly Pattern StorageModifier = new() { Name = "storage.modifier" };
        public static readonly Pattern StorageModifierImportJava = new() { Name = "storage.modifier.import.java" };
        public static readonly Pattern StorageModifierPackageJava = new() { Name = "storage.modifier.package.java" };
        public static readonly Pattern StorageType = new() { Name = "storage.type" };
        public static readonly Pattern StorageTypeCs = new() { Name = "storage.type.cs" };
        public static readonly Pattern StorageTypeJava = new() { Name = "storage.type.java" };
        public static readonly Pattern String = new() { Name = "string" };
        public static readonly Pattern StringHtml = new() { Name = "string.html" };
        public static readonly Pattern StringInterpolated = new() { Name = "string.interpolated" };
        public static readonly Pattern StringJade = new() { Name = "string.jade" };
        public static readonly Pattern StringOther = new() { Name = "string.other" };
        public static readonly Pattern StringQuoted = new() { Name = "string.quoted" };
        public static readonly Pattern StringQuotedDouble = new() { Name = "string.quoted.double" };
        public static readonly Pattern StringQuotedOther = new() { Name = "string.quoted.other" };
        public static readonly Pattern StringQuotedSingle = new() { Name = "string.quoted.single" };
        public static readonly Pattern StringQuotedTriple = new() { Name = "string.quoted.triple" };
        public static readonly Pattern StringRegexp = new() { Name = "string.regexp" };
        public static readonly Pattern StringUnquoted = new() { Name = "string.unquoted" };
        public static readonly Pattern StringXml = new() { Name = "string.xml" };
        public static readonly Pattern StringYaml = new() { Name = "string.yaml" };
        public static readonly Pattern Strong = new() { Name = "strong" };
        public static readonly Pattern Support = new() { Name = "support" };
        public static readonly Pattern SupportClass = new() { Name = "support.class" };
        public static readonly Pattern SupportConstant = new() { Name = "support.constant" };
        public static readonly Pattern SupportFunction = new() { Name = "support.function" };
        public static readonly Pattern SupportFunctionGitRebase = new() { Name = "support.function.git-rebase" };
        public static readonly Pattern SupportOther = new() { Name = "support.other" };
        public static readonly Pattern SupportPropertyValue = new() { Name = "support.property-value" };
        public static readonly Pattern SupportType = new() { Name = "support.type" };
        public static readonly Pattern SupportTypePropertyName = new() { Name = "support.type.property-name" };
        public static readonly Pattern SupportTypePropertyNameCss = new() { Name = "support.type.property-name.css" };
        public static readonly Pattern SupportTypePropertyNameLess = new() { Name = "support.type.property-name.less" };
        public static readonly Pattern SupportTypePropertyNameCcss = new() { Name = "support.type.property-name.scss" };
        public static readonly Pattern SupportVariable = new() { Name = "support.variable" };
        public static readonly Pattern Variable = new() { Name = "variable" };
        public static readonly Pattern VariableLanguage = new() { Name = "variable.language" };
        public static readonly Pattern VariableName = new() { Name = "variable.name" };
        public static readonly Pattern VariableOther = new() { Name = "variable.other" };
        public static readonly Pattern VariableParameter = new() { Name = "variable.parameter" };
    }

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
                new() { Include = "#template" },
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
                new() { Include = "#function-calls" },
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
                { 1, SyntaxToken.EntityNameTag },
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
                { 1, SyntaxToken.EntityNameTag },
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
                        { 1, SyntaxToken.EntityNameTag },
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
                    Match = @"\breturn\b",
                    Name = "keyword.control",
                },
                new()
                {
                    Match = @"\bthrow\b",
                    Name = "keyword.control",
                },
                new()
                {
                    Match = @"\bif\b",
                    Name = "keyword.control",
                },
                new()
                {
                    Match = @"\belse\b",
                    Name = "keyword.control",
                },
                new()
                {
                    Match = @"\belseif\b",
                    Name = "keyword.control",
                },
                new()
                {
                    Match = @"\bwhile\b",
                    Name = "keyword.control",
                },
                new()
                {
                    Match = @"\bfor\b",
                    Name = "keyword.control",
                },
                new()
                {
                    Match = @"\bbreak\b",
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

        repository["template"] = new Pattern()
        {
            Begin = @$"\b({DeclarationKeywords.Template})\b\s*\<",
            End = @"\>",

            BeginCaptures = new()
            {
                { 1, SyntaxToken.EntityNameTag },
            },

            Patterns = [
                new()
                {
                    Match = @$"({identifier})",
                    Captures = new()
                    {
                        { 1, SyntaxToken.EntityNameType },
                    }
                }
            ],
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

        repository["field"] = new Pattern()
        {
            Match = @$"\.\w*\b({identifier})\b(?!\s*\()"
        };

        repository["identifier"] = new Pattern()
        {
            Match = @$"\b({identifier})\b(?!\s*\()",
            Captures = new()
            {
                { 1, SyntaxToken.VariableName }
            }
        };

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
                { 1, SyntaxToken.EntityNameTag },
                { 2, SyntaxToken.EntityNameClass },
            }
        };

        repository["alias-definition"] = new Pattern()
        {
            Match = @$"({DeclarationKeywords.Alias})\s+({identifier})\s+({typeRegex})\b",
            Captures = new()
            {
                { 1, SyntaxToken.EntityNameTag },
                { 2, SyntaxToken.EntityNameClass },
                { 3, new() { Patterns = [ new() { Include = "#type" } ] } },
            }
        };

        repository["using"] = new Pattern()
        {
            Match = @$"\b({DeclarationKeywords.Using})\s+([a-zA-Z0-9_\.]+)",
            Captures = new()
            {
                { 1, SyntaxToken.KeywordControl }
            }
        };

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
                        { 1, SyntaxToken.EntityNameTag },
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
            Match = @$"(?<!\[)\b({identifier})\b\s*\(",
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
                new() { Include = "#template" },
                new() { Include = "#keyword" },

                new() { Include = "#any-statement" },
                new() { Include = "#scope" }
            ]
        }, Converter.JsonOptions);
        File.WriteAllText("/home/BB/Projects/BBLang/VSCodeExtension/syntax/bblang.json", json);
    }
}
